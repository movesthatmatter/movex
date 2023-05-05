import { tillNextTick, toResourceIdentifierStr } from 'movex-core-util';
import { computeCheckedState } from '../lib/util';
import gameReducer, { initialGameState } from './util/gameReducer';
import { movexClientMasterOrchestrator } from './util/orchestrator';
import { ToCheckedAction } from '../lib/tools/action';
import { GetReducerAction } from '../lib/tools/reducer';
require('console-group').install();

const rid = toResourceIdentifierStr({
  resourceType: 'game',
  resourceId: 'test',
});

const orchestrator = movexClientMasterOrchestrator(rid);

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

describe('Private Actoins', () => {
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
        ...initialGameState.submission,
        status: 'partial',
        white: {
          canDraw: false,
          moves: ['w:E2-E4', 'w:D2-D4'],
        },
      },
    });

    // And sender gets the new private state
    const actualSenderState = whiteMovex.state;
    expect(actualSenderState).toEqual(expectedSenderState);

    const publicState = computeCheckedState({
      ...initialGameState,
      submission: {
        ...initialGameState.submission,
        status: 'partial',
        white: {
          canDraw: false,
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

  // test('Two Clients (white, black). Both Submitting (White first). WITHOUT Reconciliation', async () => {
  //   const gameReducerWithoutRecociliation = gameReducer;
  //   // Overwrite this to always return false in this test case
  //   gameReducerWithoutRecociliation.$canReconcileState = () => {
  //     return false;
  //   };
  //   const masterEnv = createMasterEnv({
  //     store: localStore,
  //     reducer: gameReducerWithoutRecociliation,
  //     clientCountOrIdsAsString: ['white', 'black'],
  //     rid,
  //   });
  //   const [whiteClient, blackClient] = masterEnv.clients;
  //   const initialPublicState = await masterEnv.getPublic().resolveUnwrap();
  //   const whiteClientXResource = new MovexClientResource(
  //     gameReducer,
  //     initialPublicState
  //   );
  //   const blackClientXResource = new MovexClientResource(
  //     gameReducer,
  //     initialPublicState
  //   );
  //   let whiteActionFwd:
  //     | ToCheckedAction<GetReducerAction<typeof gameReducer>>
  //     | undefined = undefined;
  //   let blackActionFwd:
  //     | ToCheckedAction<GetReducerAction<typeof gameReducer>>
  //     | undefined = undefined;
  //   // Bind the client udpates
  //   whiteClient.onFwdAction((fwd) => {
  //     whiteActionFwd = fwd;
  //   });
  //   blackClient.onFwdAction((fwd) => {
  //     blackActionFwd = fwd;
  //   });
  //   // This could be part of the env (not just master env but client-master env)
  //   //  because in reality this is part of the MovexClient
  //   // Bind Action emitter to Master
  //   whiteClientXResource.onDispatched((event) => {
  //     whiteClient.emitAction(event.action);
  //   });
  //   blackClientXResource.onDispatched((event) => {
  //     blackClient.emitAction(event.action);
  //   });
  //   // White's Turn
  //   whiteClientXResource.dispatchPrivate(
  //     {
  //       type: 'submitMoves',
  //       payload: {
  //         color: 'white',
  //         moves: ['w:E2-E4', 'w:D2-D4'],
  //       },
  //       isPrivate: true,
  //     },
  //     {
  //       type: 'readySubmissionState',
  //       payload: {
  //         color: 'white',
  //       },
  //     }
  //   );
  //   await tillNextTick();
  //   blackClientXResource.reconciliateAction(blackActionFwd!);
  //   // Reset the Peer ActionFwd
  //   blackActionFwd = undefined;
  //   // Black's Turn
  //   blackClientXResource.dispatchPrivate(
  //     {
  //       type: 'submitMoves',
  //       payload: {
  //         // How not to send the color here. is it even worth it?
  //         // On argument is that the other player cna manipulat ethings, but if that's the case the whole game engine can be threatened
  //         // Not worrking ab it for now
  //         // Can get some token for {me} or smtg like that
  //         color: 'black',
  //         moves: ['b:E7-E6'],
  //       },
  //       isPrivate: true,
  //     },
  //     {
  //       type: 'readySubmissionState',
  //       payload: {
  //         color: 'black',
  //       },
  //     }
  //   );
  //   await tillNextTick();
  //   const expectedPublicState = computeCheckedState({
  //     ...initialGameState,
  //     submission: {
  //       status: 'partial',
  //       white: {
  //         canDraw: false,
  //         moves: [],
  //       },
  //       black: {
  //         canDraw: false,
  //         moves: [],
  //       },
  //     },
  //   });
  //   // White
  //   const expectedPeerState = computeCheckedState({
  //     ...initialGameState,
  //     submission: {
  //       status: 'partial',
  //       white: {
  //         canDraw: false,
  //         moves: ['w:E2-E4', 'w:D2-D4'],
  //       },
  //       black: {
  //         canDraw: false,
  //         moves: [],
  //       },
  //     },
  //   });
  //   // Black
  //   const expectedSenderState = computeCheckedState({
  //     ...initialGameState,
  //     submission: {
  //       status: 'partial',
  //       white: {
  //         canDraw: false,
  //         moves: [],
  //       },
  //       black: {
  //         canDraw: false,
  //         moves: ['b:E7-E6'],
  //       },
  //     },
  //   });
  //   // Peer State Reconciliation and Action Fwd
  //   expect(blackActionFwd).toEqual(undefined);
  //   expect(whiteActionFwd).toEqual({
  //     action: {
  //       type: 'readySubmissionState',
  //       payload: {
  //         color: 'black',
  //       },
  //     },
  //     checksum: expectedPeerState[1],
  //   });
  //   whiteClientXResource.reconciliateAction(whiteActionFwd!);
  //   // The public action gets set
  //   const actualPublic = await masterEnv.getPublic().resolveUnwrap();
  //   // Master gets the new public state
  //   expect(actualPublic).toEqual(expectedPublicState);
  //   // Peer gets the new public state
  //   expect(whiteClientXResource.get()).toEqual(expectedPeerState);
  //   // The Private Action gets set
  //   // And sender gets the new private state
  //   expect(blackClientXResource.get()).toEqual(expectedSenderState);
  // });
  // test('Two Clients. Both Submitting (White first) WITH Reconciliation', async () => {
  //   const masterEnv = createMasterEnv({
  //     store: localStore,
  //     reducer: gameReducer,
  //     clientCountOrIdsAsString: ['white', 'black'],
  //     rid,
  //   });
  //   const [whiteClient, blackClient] = masterEnv.clients;
  //   const initialPublicState = await masterEnv.getPublic().resolveUnwrap();
  //   const whiteClientXResource = new MovexClientResource(
  //     gameReducer,
  //     initialPublicState
  //   );
  //   const blackClientXResource = new MovexClientResource(
  //     gameReducer,
  //     initialPublicState
  //   );
  //   let whiteActionFwd:
  //     | ToCheckedAction<GetReducerAction<typeof gameReducer>>
  //     | undefined = undefined;
  //   let blackActionFwd:
  //     | ToCheckedAction<GetReducerAction<typeof gameReducer>>
  //     | undefined = undefined;
  //   // Bind the client udpates
  //   whiteClient.onFwdAction((fwd) => {
  //     whiteActionFwd = fwd;
  //   });
  //   blackClient.onFwdAction((fwd) => {
  //     blackActionFwd = fwd;
  //   });
  //   whiteClient.onReconciliatoryFwdActions((event) => {
  //   })
  //   // This could be part of the env (not just master env but client-master env)
  //   //  because in reality this is part of the MovexClient
  //   // Bind Action emitter to Master
  //   whiteClientXResource.onDispatched((event) => {
  //     whiteClient.emitAction(event.action);
  //   });
  //   blackClientXResource.onDispatched((event) => {
  //     blackClient.emitAction(event.action);
  //   });
  //   // White's Turn
  //   whiteClientXResource.dispatchPrivate(
  //     {
  //       type: 'submitMoves',
  //       payload: {
  //         color: 'white',
  //         moves: ['w:E2-E4', 'w:D2-D4'],
  //       },
  //       isPrivate: true,
  //     },
  //     {
  //       type: 'readySubmissionState',
  //       payload: {
  //         color: 'white',
  //       },
  //     }
  //   );
  //   await tillNextTick();
  //   blackClientXResource.reconciliateAction(blackActionFwd!);
  //   // Reset the Peer ActionFwd
  //   blackActionFwd = undefined;
  //   // Black's Turn
  //   blackClientXResource.dispatchPrivate(
  //     {
  //       type: 'submitMoves',
  //       payload: {
  //         // How not to send the color here. is it even worth it?
  //         // On argument is that the other player cna manipulat ethings, but if that's the case the whole game engine can be threatened
  //         // Not worrking ab it for now
  //         // Can get some token for {me} or smtg like that
  //         color: 'black',
  //         moves: ['b:E7-E6'],
  //       },
  //       isPrivate: true,
  //     },
  //     {
  //       type: 'readySubmissionState',
  //       payload: {
  //         color: 'black',
  //       },
  //     }
  //   );
  //   await tillNextTick();
  //   const expectedPublicState = computeCheckedState({
  //     ...initialGameState,
  //     submission: {
  //       status: 'partial',
  //       white: {
  //         canDraw: false,
  //         moves: [],
  //       },
  //       black: {
  //         canDraw: false,
  //         moves: [],
  //       },
  //     },
  //   });
  //   // White
  //   const expectedPeerState = computeCheckedState({
  //     ...initialGameState,
  //     submission: {
  //       status: 'partial',
  //       white: {
  //         canDraw: false,
  //         moves: ['w:E2-E4', 'w:D2-D4'],
  //       },
  //       black: {
  //         canDraw: false,
  //         moves: [],
  //       },
  //     },
  //   });
  //   // Black
  //   // const expectedSenderState = computeCheckedState({
  //   //   ...initialGameState,
  //   //   submission: {
  //   //     status: 'partial',
  //   //     white: {
  //   //       canDraw: false,
  //   //       moves: [],
  //   //     },
  //   //     black: {
  //   //       canDraw: false,
  //   //       moves: ['b:E7-E6'],
  //   //     },
  //   //   },
  //   // });
  //   // Peer State Reconciliation and Action Fwd
  //   expect(blackActionFwd).toEqual(undefined);
  //   expect(whiteActionFwd).toEqual({
  //     action: {
  //       type: 'readySubmissionState',
  //       payload: {
  //         color: 'black',
  //       },
  //     },
  //     checksum: expectedPeerState[1],
  //   });
  //   whiteClientXResource.reconciliateAction(whiteActionFwd!);
  //   // The public action gets set
  //   const actualPublic = await masterEnv.getPublic().resolveUnwrap();
  //   // Master gets the new public state
  //   expect(actualPublic).toEqual(expectedPublicState);
  //   // Peer gets the new public state
  //   // expect(whiteClientXResource.get()).toEqual(expectedPeerState);
  //   expect(whiteClientXResource.get()).toEqual(expectedPublicState);
  //   // The Private Action gets set
  //   // And sender gets the new private state
  //   // expect(blackClientXResource.get()).toEqual(expectedSenderState);
  //   expect(blackClientXResource.get()).toEqual(expectedPublicState);
  // });
  // Test with many more peers
});
