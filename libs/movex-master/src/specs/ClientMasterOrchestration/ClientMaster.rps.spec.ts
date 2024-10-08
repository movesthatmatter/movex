import { computeCheckedState } from 'movex-core-util';
import { rpsReducer, rpsInitialState, tillNextTick } from 'movex-specs-util';
import { createSanitizedMovexClient } from '../../lib';
import { movexClientMasterOrchestrator } from './orchestrator';

const orchestrator = movexClientMasterOrchestrator();

beforeEach(async () => {
  await orchestrator.unsubscribe();
});

test('2 Clients. Both Submitting (White first) WITH Reconciliation and the reconciliatory step changes derived state', async () => {
  const clientAId = 'client-a';
  const clientBId = 'client-b';

  const {
    clients: [clientA, clientB],
    master,
  } = orchestrator.orchestrate({
    clientIds: [clientAId, clientBId],
    reducer: rpsReducer,
    resourceType: 'game',
  });

  const { rid } = await clientA.create(rpsInitialState).resolveUnwrap();

  const aMovex = clientA.bind(rid);
  const bMovex = clientB.bind(rid);

  aMovex.dispatch({
    type: 'addPlayer',
    payload: {
      id: clientAId,
      playerLabel: 'playerA',
    },
  });

  await tillNextTick();

  bMovex.dispatch({
    type: 'addPlayer',
    payload: {
      id: clientBId,
      playerLabel: 'playerB',
    },
  });

  await tillNextTick();

  aMovex.dispatchPrivate(
    {
      type: 'submit',
      isPrivate: true,
      payload: {
        playerLabel: 'playerA',
        rps: 'paper',
      },
    },
    {
      type: 'setReadySubmission',
      payload: {
        playerLabel: 'playerA',
      },
    }
  );

  await tillNextTick();

  const expectedAfterPrivateAction = {
    checkedState: computeCheckedState({
      ...rpsInitialState,
      currentGame: {
        ...rpsInitialState.currentGame,
        players: {
          playerA: {
            id: clientAId,
            label: 'playerA',
          },
          playerB: {
            id: clientBId,
            label: 'playerB',
          },
        },
        submissions: {
          ...rpsInitialState.currentGame.submissions,
          playerA: {
            play: 'paper',
          },
        },
      },
    }),
    subscribers: {
      'client-a': createSanitizedMovexClient('client-a'),
      'client-b': createSanitizedMovexClient('client-b'),
    },
  };

  const actualAfterPrivateAction = aMovex.get();

  expect(actualAfterPrivateAction).toEqual(expectedAfterPrivateAction);

  bMovex.dispatchPrivate(
    {
      type: 'submit',
      isPrivate: true,
      payload: {
        rps: 'rock',
        playerLabel: 'playerB',
      },
    },
    {
      type: 'setReadySubmission',
      payload: {
        playerLabel: 'playerB',
      },
    }
  );

  await tillNextTick();

  const expectedAfterPrivateRevelatoryAction = computeCheckedState({
    ...rpsInitialState,
    currentGame: {
      players: {
        playerA: {
          id: clientAId,
          label: 'playerA',
        },
        playerB: {
          id: clientBId,
          label: 'playerB',
        },
      },
      submissions: {
        playerA: {
          play: 'paper',
        },
        playerB: {
          play: 'rock',
        },
      },
      winner: 'paper',
    },
  });

  const actualAfterPrivateRevelatoryAction = bMovex.getCheckedState();

  expect(actualAfterPrivateRevelatoryAction).toEqual(
    expectedAfterPrivateRevelatoryAction
  );

  // The 2 clients are the same after revelation
  expect(aMovex.get()).toEqual(bMovex.get());

  const masterPublicState = await master.getPublicState(rid).resolveUnwrap();
  expect(masterPublicState).toEqual(actualAfterPrivateRevelatoryAction);
});

test('Same Kind Reconciliatory Actions Bug. See https://github.com/movesthatmatter/movex/issues/8', async () => {
  const clientAId = 'client-a';
  const clientBId = 'client-b';

  const {
    clients: [clientA, clientB],
    master,
  } = orchestrator.orchestrate({
    clientIds: [clientAId, clientBId],
    reducer: rpsReducer,
    resourceType: 'game',
  });

  const { rid } = await clientA.create(rpsInitialState).resolveUnwrap();

  const aMovex = clientA.bind(rid);
  const bMovex = clientB.bind(rid);

  aMovex.dispatch({
    type: 'addPlayer',
    payload: {
      id: clientAId,
      playerLabel: 'playerA',
    },
  });

  await tillNextTick();

  bMovex.dispatch({
    type: 'addPlayer',
    payload: {
      id: clientBId,
      playerLabel: 'playerB',
    },
  });

  await tillNextTick();

  aMovex.dispatchPrivate(
    {
      type: 'submit',
      isPrivate: true,
      payload: {
        playerLabel: 'playerA',
        rps: 'paper',
      },
    },
    {
      type: 'setReadySubmission',
      payload: {
        playerLabel: 'playerA',
      },
    }
  );

  await tillNextTick();

  aMovex.dispatchPrivate(
    {
      type: 'submit',
      isPrivate: true,
      payload: {
        playerLabel: 'playerA',
        rps: 'rock',
      },
    },
    {
      type: 'setReadySubmission',
      payload: {
        playerLabel: 'playerA',
      },
    }
  );

  await tillNextTick();

  const expectedAfterPrivateAction = computeCheckedState({
    ...rpsInitialState,
    currentGame: {
      ...rpsInitialState.currentGame,
      players: {
        playerA: {
          id: clientAId,
          label: 'playerA',
        },
        playerB: {
          id: clientBId,
          label: 'playerB',
        },
      },
      submissions: {
        ...rpsInitialState.currentGame.submissions,
        playerA: {
          play: 'rock',
        },
      },
    },
  });

  const actualAfterPrivateAction = aMovex.getCheckedState();

  expect(actualAfterPrivateAction).toEqual(expectedAfterPrivateAction);

  bMovex.dispatchPrivate(
    {
      type: 'submit',
      isPrivate: true,
      payload: {
        rps: 'rock',
        playerLabel: 'playerB',
      },
    },
    {
      type: 'setReadySubmission',
      payload: {
        playerLabel: 'playerB',
      },
    }
  );

  await tillNextTick();

  const expectedAfterPrivateRevelatoryAction = computeCheckedState({
    ...rpsInitialState,
    currentGame: {
      players: {
        playerA: {
          id: clientAId,
          label: 'playerA',
        },
        playerB: {
          id: clientBId,
          label: 'playerB',
        },
      },
      submissions: {
        playerA: {
          play: 'rock',
        },
        playerB: {
          play: 'rock',
        },
      },
      winner: '1/2',
    },
  });

  const actualAfterPrivateRevelatoryAction = bMovex.getCheckedState();

  expect(actualAfterPrivateRevelatoryAction).toEqual(
    expectedAfterPrivateRevelatoryAction
  );

  // The 2 clients are the same after revelation
  expect(aMovex.get()).toEqual(bMovex.get());

  const masterPublicState = await master.getPublicState(rid).resolveUnwrap();
  expect(masterPublicState).toEqual(actualAfterPrivateRevelatoryAction);
});

test('Ensure further actinos can be dispatched after a Master-Resync', async () => {
  const clientAId = 'client-a';
  const clientBId = 'client-b';

  const {
    clients: [clientA, clientB],
    master,
  } = orchestrator.orchestrate({
    clientIds: [clientAId, clientBId],
    reducer: rpsReducer,
    resourceType: 'game',
  });

  const { rid } = await clientA.create(rpsInitialState).resolveUnwrap();

  const aMovex = clientA.bind(rid);
  const bMovex = clientB.bind(rid);

  aMovex.dispatch({
    type: 'addPlayer',
    payload: {
      id: clientAId,
      playerLabel: 'playerA',
    },
  });

  await tillNextTick();

  bMovex.dispatch({
    type: 'addPlayer',
    payload: {
      id: clientBId,
      playerLabel: 'playerB',
    },
  });

  await tillNextTick();

  aMovex.dispatchPrivate(
    {
      type: 'submit',
      isPrivate: true,
      payload: {
        playerLabel: 'playerA',
        rps: 'paper',
      },
    },
    {
      type: 'setReadySubmission',
      payload: {
        playerLabel: 'playerA',
      },
    }
  );

  await tillNextTick();

  aMovex.dispatchPrivate(
    {
      type: 'submit',
      isPrivate: true,
      payload: {
        playerLabel: 'playerA',
        rps: 'rock',
      },
    },
    {
      type: 'setReadySubmission',
      payload: {
        playerLabel: 'playerA',
      },
    }
  );

  await tillNextTick();

  bMovex.dispatchPrivate(
    {
      type: 'submit',
      isPrivate: true,
      payload: {
        rps: 'rock',
        playerLabel: 'playerB',
      },
    },
    {
      type: 'setReadySubmission',
      payload: {
        playerLabel: 'playerB',
      },
    }
  );

  await tillNextTick();

  bMovex.dispatch({
    type: 'playAgain',
  });

  await tillNextTick();

  expect(bMovex.getCheckedState()).toEqual(
    computeCheckedState({
      ...rpsInitialState,
      currentGame: {
        ...rpsInitialState.currentGame,
        players: {
          playerA: {
            id: clientAId,
            label: 'playerA',
          },
          playerB: {
            id: clientBId,
            label: 'playerB',
          },
        },
      },
    })
  );

  aMovex.dispatchPrivate(
    {
      type: 'submit',
      payload: {
        playerLabel: 'playerA',
        rps: 'paper',
      },
      isPrivate: true,
    },
    {
      type: 'setReadySubmission',
      payload: {
        playerLabel: 'playerA',
      },
    }
  );

  await tillNextTick();

  expect(aMovex.getCheckedState()).toEqual(
    computeCheckedState({
      ...rpsInitialState,
      currentGame: {
        ...rpsInitialState.currentGame,
        players: {
          playerA: {
            id: clientAId,
            label: 'playerA',
          },
          playerB: {
            id: clientBId,
            label: 'playerB',
          },
        },
        submissions: {
          ...rpsInitialState.currentGame.submissions,
          playerA: {
            play: 'paper',
          },
        },
      },
    })
  );

  expect(bMovex.getCheckedState()).toEqual(
    computeCheckedState({
      ...rpsInitialState,
      currentGame: {
        ...rpsInitialState.currentGame,
        players: {
          playerA: {
            id: clientAId,
            label: 'playerA',
          },
          playerB: {
            id: clientBId,
            label: 'playerB',
          },
        },
        submissions: {
          ...rpsInitialState.currentGame.submissions,
          playerA: {
            play: '$SECRET',
          },
        },
      },
    })
  );

  bMovex.dispatchPrivate(
    {
      type: 'submit',
      payload: {
        playerLabel: 'playerB',
        rps: 'scissors',
      },
      isPrivate: true,
    },
    {
      type: 'setReadySubmission',
      payload: {
        playerLabel: 'playerB',
      },
    }
  );

  await tillNextTick();

  const expectedSharedState = computeCheckedState({
    ...rpsInitialState,
    currentGame: {
      ...rpsInitialState.currentGame,
      players: {
        playerA: {
          id: clientAId,
          label: 'playerA',
        },
        playerB: {
          id: clientBId,
          label: 'playerB',
        },
      },
      submissions: {
        playerA: {
          play: 'paper',
        },
        playerB: {
          play: 'scissors',
        },
      },
      winner: 'scissors',
    },
  });

  expect(bMovex.getCheckedState()).toEqual(expectedSharedState);
  expect(aMovex.getCheckedState()).toEqual(expectedSharedState);
});
