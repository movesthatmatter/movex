import { movexClientMasterOrchestrator } from '../util/orchestrator';
// import matchReducer, { initialMatchState } from '../resources/matchReducer';
import rpsReducer, {
  initialState as rpsInitialState,
} from '../resources/rockPaperScissors.movex';
import { tillNextTick } from 'movex-core-util';
import { computeCheckedState } from '../../lib/util';
require('console-group').install();

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
          play: 'paper',
        },
      },
    },
  });

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

  const actualAfterPrivateRevelatoryAction = bMovex.state;

  expect(actualAfterPrivateRevelatoryAction).toEqual(
    expectedAfterPrivateRevelatoryAction
  );

  // The 2 clients are the same after revelation
  expect(aMovex.state).toEqual(bMovex.state);

  const masterPublicState = await master.getPublicState(rid).resolveUnwrap();
  expect(masterPublicState).toEqual(actualAfterPrivateRevelatoryAction);
});
