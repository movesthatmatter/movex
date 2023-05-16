import { tillNextTick, toResourceIdentifierStr } from 'movex-core-util';
import { computeCheckedState } from '../../lib/util';
import gameReducer, { initialGameState } from '../resources/gameReducer';
import gameReducerWithDerivedState, {
  initialRawGameStateWithDerivedState,
} from '../resources/gameReducerWithDerivedState';
import { movexClientMasterOrchestrator } from '../util/orchestrator';
require('console-group').install();

const rid = toResourceIdentifierStr({
  resourceType: 'game',
  resourceId: 'test',
});

const orchestrator = movexClientMasterOrchestrator();

beforeEach(async () => {
  await orchestrator.unsubscribe();
});

describe('Public Actions', () => {
  test('Dispatch with 1 client only', async () => {
    const [gameClientResource] = await orchestrator.orchestrate({
      clientIds: ['test-client'],
      reducer: gameReducer,
      resourceType: 'game',
    });

    const created = await gameClientResource
      .create(initialGameState)
      .resolveUnwrap();

    expect(created).toEqual({
      rid: created.rid, // The id isn't too important here
      state: computeCheckedState(initialGameState),
    });

    const movex = gameClientResource.bind(created.rid);

    movex.dispatch({
      type: 'submitMoves',
      payload: {
        moves: ['w:E2-E4'],
        color: 'white',
      },
    });

    await tillNextTick();

    const actual = await movex.get();

    const expected = computeCheckedState({
      ...initialGameState,
      submission: {
        ...initialGameState.submission,
        status: 'partial',
        white: {
          moves: ['w:E2-E4'],
          canDraw: false,
        },
      },
    });

    expect(actual).toEqual(expected);
  });

  test('With 2 Clients', async () => {
    const [whiteClient, blackClient] = orchestrator.orchestrate({
      clientIds: ['white-client', 'black-client'],
      reducer: gameReducer,
      resourceType: 'game',
    });

    const { rid } = await whiteClient.create(initialGameState).resolveUnwrap();

    const whiteMovex = whiteClient.bind(rid);
    const blackMovex = blackClient.bind(rid);

    whiteMovex.dispatch({
      type: 'change',
      payload: 5,
    });

    await tillNextTick();

    const expected = computeCheckedState({
      ...initialGameState,
      count: 5,
    });

    expect(whiteMovex.state).toEqual(expected);

    // The black would only be the same as white if the master works
    expect(blackMovex.state).toEqual(expected);
  });
});

describe('Private Actions', () => {
  test('2 Players - Only 1 Submits', async () => {
    const [whiteClient, blackClient] = orchestrator.orchestrate({
      clientIds: ['white-client', 'black-client'],
      reducer: gameReducer,
      resourceType: 'game',
    });

    const { rid } = await whiteClient.create(initialGameState).resolveUnwrap();

    const whiteMovex = whiteClient.bind(rid);
    const blackMovex = blackClient.bind(rid);

    // White's Turn
    whiteMovex.dispatchPrivate(
      {
        type: 'submitMoves',
        payload: {
          color: 'white',
          moves: ['w:E2-E4', 'w:D2-D4'],
        },
        isPrivate: true,
      },
      {
        type: 'readySubmissionState',
        payload: {
          color: 'white',
        },
      }
    );

    await tillNextTick();

    // This is the sender private
    // White
    const expectedSenderState = computeCheckedState({
      ...initialGameState,
      submission: {
        status: 'partial',
        white: {
          canDraw: false,
          moves: ['w:E2-E4', 'w:D2-D4'],
        },
        black: {
          canDraw: true,
          moves: [],
        },
      },
    });

    // And sender gets the new private state
    const actualSenderState = whiteMovex.state;
    expect(actualSenderState).toEqual(expectedSenderState);

    const publicState = computeCheckedState({
      ...initialGameState,
      submission: {
        status: 'partial',
        white: {
          canDraw: false,
          moves: [],
        },
        black: {
          canDraw: true,
          moves: [],
        },
      },
    });

    // In this case is the same as the public b/c no private changes has been made
    // Black
    const expectedPeerState = publicState;
    const actualPeerState = blackMovex.state;

    // Peer gets the new public state
    expect(actualPeerState).toEqual(expectedPeerState);
  });

  test('2 Players – Both Submit (White first). WITHOUT Ability to Reconciliatiate at Reducer', async () => {
    const gameReducerWithoutRecociliation = gameReducer.bind({});
    // Overwrite this to always return false in this test case
    gameReducerWithoutRecociliation.$canReconcileState = () => {
      return false;
    };

    const [whiteClient, blackClient] = orchestrator.orchestrate({
      clientIds: ['white-client', 'black-client'],
      reducer: gameReducerWithoutRecociliation,
      resourceType: 'game',
    });

    const { rid } = await whiteClient.create(initialGameState).resolveUnwrap();

    const whiteMovex = whiteClient.bind(rid);
    const blackMovex = blackClient.bind(rid);

    // White's Turn
    whiteMovex.dispatchPrivate(
      {
        type: 'submitMoves',
        payload: {
          color: 'white',
          moves: ['w:E2-E4', 'w:D2-D4'],
        },
        isPrivate: true,
      },
      {
        type: 'readySubmissionState',
        payload: {
          color: 'white',
        },
      }
    );

    await tillNextTick();

    // This is the sender private
    // White
    const expectedWhiteState = computeCheckedState({
      ...initialGameState,
      submission: {
        status: 'partial',
        white: {
          canDraw: false,
          moves: ['w:E2-E4', 'w:D2-D4'],
        },
        black: {
          canDraw: true,
          moves: [],
        },
      },
    });

    // And sender gets the new private state
    const actualWhiteState = whiteMovex.state;
    expect(actualWhiteState).toEqual(expectedWhiteState);

    // Black's Turn
    blackMovex.dispatchPrivate(
      {
        type: 'submitMoves',
        payload: {
          color: 'black',
          moves: ['b:E7-E6'],
        },
        isPrivate: true,
      },
      {
        type: 'readySubmissionState',
        payload: {
          color: 'black',
        },
      }
    );

    await tillNextTick();

    // White
    const expectedPeerState = computeCheckedState({
      ...initialGameState,
      submission: {
        status: 'partial',
        white: {
          canDraw: false,
          moves: ['w:E2-E4', 'w:D2-D4'],
        },
        black: {
          canDraw: false,
          moves: [],
        },
      },
    });

    const actualPeerState = whiteMovex.state;
    expect(actualPeerState).toEqual(expectedPeerState);

    // Black
    const expectedSenderState = computeCheckedState({
      ...initialGameState,
      submission: {
        status: 'partial',
        white: {
          canDraw: false,
          moves: [],
        },
        black: {
          canDraw: false,
          moves: ['b:E7-E6'],
        },
      },
    });
    // The Private Action gets set
    // And sender gets the new private state
    const actualSenderState = blackMovex.state;
    expect(actualSenderState).toEqual(expectedSenderState);
  });

  test('2 Clients. Both Submitting (White first) WITH Reconciliation', async () => {
    const [whiteClient, blackClient] = orchestrator.orchestrate({
      clientIds: ['white-client', 'black-client'],
      reducer: gameReducerWithDerivedState,
      resourceType: 'game',
    });

    const { rid } = await whiteClient
      .create(initialRawGameStateWithDerivedState)
      .resolveUnwrap();

    const whiteMovex = whiteClient.bind(rid);
    const blackMovex = blackClient.bind(rid);

    // White's Turn
    whiteMovex.dispatchPrivate(
      {
        type: 'submitMoves',
        payload: {
          color: 'white',
          moves: ['w:E2-E4', 'w:D2-D4'],
        },
        isPrivate: true,
      },
      {
        type: 'readySubmissionState',
        payload: {
          color: 'white',
        },
      }
    );

    await tillNextTick();

    // This is the sender private
    // White
    const expectedWhiteState = computeCheckedState({
      submission: {
        white: {
          canDraw: false,
          moves: ['w:E2-E4', 'w:D2-D4'],
        },
        black: {
          canDraw: true,
          moves: null,
        },
      },
    });

    // And sender gets the new private state
    const actualWhiteState = whiteMovex.state;
    expect(actualWhiteState).toEqual(expectedWhiteState);

    // Black's Turn (Reconciliatory Turn)
    blackMovex.dispatchPrivate(
      {
        type: 'submitMoves',
        payload: {
          color: 'black',
          moves: ['b:E7-E6'],
        },
        isPrivate: true,
      },
      {
        type: 'readySubmissionState',
        payload: {
          color: 'black',
        },
      }
    );

    await tillNextTick();

    const expected = computeCheckedState({
      submission: {
        white: {
          canDraw: false,
          moves: ['w:E2-E4', 'w:D2-D4'],
        },
        black: {
          canDraw: false,
          moves: ['b:E7-E6'],
        },
      },
    });

    // They are bot equal now
    const actualPeerState = whiteMovex.state;
    expect(actualPeerState).toEqual(expected);

    const actualSenderState = blackMovex.state;
    expect(actualSenderState).toEqual(expected);

    // expect(actualPeerState[0].submission.status).toBe('reconciled');
  });
  // Test with many more peers
});
