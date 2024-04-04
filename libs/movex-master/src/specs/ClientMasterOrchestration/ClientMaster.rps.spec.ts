import { computeCheckedState, globalLogsy } from 'movex-core-util';
import { rpsReducer, rpsInitialState, tillNextTick } from 'movex-specs-util';
import { movexClientMasterOrchestrator } from 'movex-master';
import { install } from 'console-group';
install();

const orchestrator = movexClientMasterOrchestrator();

beforeAll(() => {
  globalLogsy.disable();
});

afterAll(() => {
  globalLogsy.enable();
});

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
      'client-a': null,
      'client-b': null,
    },
  };

  const actualAfterPrivateAction = aMovex.state;

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

  const actualAfterPrivateRevelatoryAction = bMovex.state.checkedState;

  expect(actualAfterPrivateRevelatoryAction).toEqual(
    expectedAfterPrivateRevelatoryAction
  );

  // The 2 clients are the same after revelation
  expect(aMovex.state).toEqual(bMovex.state);

  const masterPublicState = await master.getPublicState(rid).resolveUnwrap();
  expect(masterPublicState).toEqual(
    actualAfterPrivateRevelatoryAction
  );
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

  const actualAfterPrivateAction = aMovex.state.checkedState;

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

  const actualAfterPrivateRevelatoryAction = bMovex.state.checkedState;

  expect(actualAfterPrivateRevelatoryAction).toEqual(
    expectedAfterPrivateRevelatoryAction
  );

  // The 2 clients are the same after revelation
  expect(aMovex.state).toEqual(bMovex.state);

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

  expect(bMovex.state.checkedState).toEqual(
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

  expect(aMovex.state.checkedState).toEqual(
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

  expect(bMovex.state.checkedState).toEqual(
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

  expect(bMovex.state.checkedState).toEqual(expectedSharedState);
  expect(aMovex.state.checkedState).toEqual(expectedSharedState);
});
