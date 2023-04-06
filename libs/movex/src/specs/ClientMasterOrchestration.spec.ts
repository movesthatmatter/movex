import {
  delay,
  invoke,
  noop,
  tillNextTick,
  toResourceIdentifierStr,
} from 'movex-core-util';
import { computeCheckedState } from '../lib/util';
import gameReducer, { initialGameState } from './util/gameReducer';
import {
  GetReducerAction,
  GetReducerState,
  MovexReducer,
} from '../lib/tools/reducer';
import { AnyAction, ToCheckedAction } from '../lib/tools/action';
import { LocalMovexStore } from '../lib/movex-store';

import {
  ConnectionToClient,
  MovexMasterServer,
  MovexMasterResource,
} from '../lib/master';
import { MockConnectionEmitter } from './util/MockConnectionEmitter';
import { Movex } from '../lib/client/Movex';
import { ConnectionToMaster } from '../lib/client/ConnectionToMaster';
import { UnsubscribeFn } from '../lib/core-types';
require('console-group').install();

const rid = toResourceIdentifierStr({
  resourceType: 'game',
  resourceId: 'test',
});

let unsubscribe: UnsubscribeFn = noop;

beforeEach(async () => {
  await unsubscribe();

  // await localStore.clearAll().resolveUnwrap();

  // await localStore.create(rid, initialGameState).resolveUnwrap();
});

// const getMovexWithEmitter = <
//   TState extends any,
//   TAction extends AnyAction = AnyAction
// >(
//   emitter: MockConnectionEmitter,
//   clientId = 'test-client'
// ) => new Movex(new ConnectionToMaster(clientId, emitter));

// const getMovex = <TState extends any, TAction extends AnyAction = AnyAction>(
//   reducer: MovexReducer<TState, TAction>,
//   clientId = 'test-client'
// ) => {
//   const localStore = new LocalMovexStore<GetReducerState<typeof reducer>>();
//   const masterResource = new MovexMasterResource(reducer, localStore);
//   const mockEmitter = new MockConnectionEmitter(masterResource, clientId);

//   return new Movex(new ConnectionToMaster(clientId, mockEmitter));
// };

const orchestrate = async <
  S,
  A extends AnyAction,
  TResourceType extends string
>({
  clientIds,
  reducer,
  resourceType,
  initialState,
}: {
  clientIds: string[];
  reducer: MovexReducer<S, A>;
  resourceType: TResourceType;
  initialState: S;
}) => {
  // const clientId = 'test-client-a';

  // master setup
  const masterStore = new LocalMovexStore<S>();

  await masterStore.create(rid, initialState).resolveUnwrap();

  const masterResource = new MovexMasterResource(reducer, masterStore);
  const masterServer = new MovexMasterServer({
    [resourceType]: masterResource,
  });

  return clientIds.map((clientId) => {
    // // Would this be the only one for both client and master or seperate?
    const mockEmitter = new MockConnectionEmitter<S, A, TResourceType>(
      masterResource,
      clientId
    );

    const connectionToClient = new ConnectionToClient<S, A, TResourceType>(
      clientId,
      mockEmitter
    );

    const removeClientConnectionFromMaster =
      masterServer.addClientConnection(connectionToClient);

    // TODO: This could be done better, but since the unsibscriber is async need to work iwth an sync iterator
    //  for now this should do
    const oldUnsubscribe = unsubscribe;
    unsubscribe = async () => {
      await oldUnsubscribe();

      removeClientConnectionFromMaster();

      await masterStore.clearAll().resolveUnwrap();
    };

    // client
    const connectionToMaster = new ConnectionToMaster<S, A, TResourceType>(
      clientId,
      mockEmitter
    );

    const movex = new Movex(connectionToMaster);

    return movex.register(resourceType, reducer);
  });
};

describe('Public Actions', () => {
  test('Dispatch with 1 client only', async () => {
    // simply connect the client to master and make the proper calls
    //  the most important one is the event emitter from client to master and master to client
    // those will be mocks
    // const clientId = 'test-client-a';
    // const gameResourceType = 'game';
    // type GameResourceType = typeof gameResourceType;

    // // master setup
    // const masterGameResource = new MovexMasterResource(gameReducer, localStore);

    // const masterServer = new MovexMasterServer({
    //   game: masterGameResource,
    // }); // here add the master resources

    // // // Would this be the only one for both client and master or seperate?
    // const mockEmitter = new MockConnectionEmitter<
    //   GetReducerState<typeof gameReducer>,
    //   GetReducerAction<typeof gameReducer>,
    //   GameResourceType
    // >(masterGameResource, clientId);

    // const connectionToClientA = new ConnectionToClient<
    //   GetReducerState<typeof gameReducer>,
    //   GetReducerAction<typeof gameReducer>,
    //   GameResourceType
    // >(clientId, mockEmitter);

    // const removeClientConnectionFromMaster =
    //   masterServer.addClientConnection(connectionToClientA);

    // // client
    // const connectionToMaster = new ConnectionToMaster<
    //   GetReducerState<typeof gameReducer>,
    //   GetReducerAction<typeof gameReducer>,
    //   GameResourceType
    // >(clientId, mockEmitter);

    // const movex = new Movex(connectionToMaster);

    // const gameClientResource = movex.register(gameResourceType, gameReducer);

    const [gameClientResource] = await orchestrate({
      clientIds: ['test-client'],
      reducer: gameReducer,
      resourceType: 'game',
      initialState: initialGameState,
    });

    const rr = await gameClientResource
      .create(initialGameState)
      .resolveUnwrap();

    expect(rr).toEqual({
      rid: rr.rid, // The id isn't too important here
      state: computeCheckedState(initialGameState),
    });

    const r = gameClientResource.use(rid);

    r.dispatch({
      type: 'submitMoves',
      payload: {
        moves: ['w:E2-E4'],
        color: 'white',
      },
    });

    await tillNextTick();

    const actual = r.get();
    const expected = computeCheckedState({
      ...initialGameState,
      // count: 1,
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

  test.only('With 2 Clients', async () => {
    const [whiteClient, blackClient] = await orchestrate({
      clientIds: ['white-client', 'black-client'],
      reducer: gameReducer,
      resourceType: 'game',
      initialState: initialGameState,
    });

    const { rid } = await whiteClient.create(initialGameState).resolveUnwrap();

    const whiteMovex = whiteClient.use(rid);
    const blackMovex = blackClient.use(rid);

    whiteMovex.dispatch({
      type: 'change',
      payload: 5,
    });

    await tillNextTick();

    const expected = computeCheckedState({
      ...initialGameState,
      count: 5,
    });

    expect(whiteMovex.get()).toEqual(expected);

    // The black would only be the same as white if the master works
    expect(blackMovex.get()).toEqual(expected);
  });

  // test('With 2 Clients', async () => {
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

  //   blackClient.onFwdAction((fwd) => {
  //     const result = blackClientXResource.reconciliateAction(fwd);

  //     expect(result.ok).toBe(true);
  //   });

  //   whiteClientXResource.onDispatched((event) => {
  //     whiteClient.emitAction(event.action);
  //   });

  //   blackClientXResource.onDispatched((event) => {
  //     blackClient.emitAction(event.action);
  //   });

  //   whiteClientXResource.dispatch({
  //     type: 'change',
  //     payload: 5,
  //   });

  //   await tillNextTick();

  //   const expectedMasterPublicState = computeCheckedState({
  //     ...initialGameState,
  //     count: 5,
  //   });

  //   const actualPublicState = await masterEnv.getPublic().resolveUnwrap();

  //   expect(actualPublicState).toEqual(expectedMasterPublicState);

  //   expect(whiteClientXResource.get()).toEqual(expectedMasterPublicState);

  //   // And even the peer client got the next state! Yey!
  //   expect(blackClientXResource.get()).toEqual(expectedMasterPublicState);
  // });
});

// describe('Private Actoins', () => {
//   test('Two Plyers – only one submits', async () => {
//     const masterEnv = createMasterEnv({
//       store: localStore,
//       reducer: gameReducer,
//       clientCountOrIdsAsString: ['white', 'black'],
//       rid,
//     });

//     const [whiteClient, blackClient] = masterEnv.clients;

//     const initialPublicState = await masterEnv.getPublic().resolveUnwrap();

//     const whiteClientXResource = new MovexClientResource(
//       gameReducer,
//       initialPublicState
//     );
//     const blackClientXResource = new MovexClientResource(
//       gameReducer,
//       initialPublicState
//     );

//     let whiteActionFwd:
//       | ToCheckedAction<GetReducerAction<typeof gameReducer>>
//       | undefined = undefined;
//     let blackActionFwd:
//       | ToCheckedAction<GetReducerAction<typeof gameReducer>>
//       | undefined = undefined;

//     // Bind the client udpates
//     whiteClient.onFwdAction((fwd) => {
//       whiteActionFwd = fwd;
//     });

//     blackClient.onFwdAction((fwd) => {
//       blackActionFwd = fwd;
//     });

//     // This could be part of the env (not just master env but client-master env)
//     //  because in reality this is part of the MovexClient
//     // // Bind Action emitter to Master
//     whiteClientXResource.onDispatched((event) => {
//       whiteClient.emitAction(event.action);
//     });

//     blackClientXResource.onDispatched((event) => {
//       blackClient.emitAction(event.action);
//     });

//     // White's Turn

//     whiteClientXResource.dispatchPrivate(
//       {
//         type: 'submitMoves',
//         payload: {
//           color: 'white',
//           moves: ['w:E2-E4', 'w:D2-D4'],
//         },
//         isPrivate: true,
//       },
//       {
//         type: 'readySubmissionState',
//         payload: {
//           color: 'white',
//         },
//       }
//     );

//     await tillNextTick();

//     const expectedPublicState = computeCheckedState({
//       ...initialGameState,
//       submission: {
//         ...initialGameState.submission,
//         status: 'partial',
//         white: {
//           canDraw: false,
//           moves: [],
//         },
//       },
//     });

//     // In this case is the same as the public b/c no private changes has been made
//     // Black
//     let expectedPeerState = expectedPublicState;

//     // This is the sender private
//     // White
//     const expectedSenderState = computeCheckedState({
//       ...initialGameState,
//       submission: {
//         ...initialGameState.submission,
//         status: 'partial',
//         white: {
//           canDraw: false,
//           moves: ['w:E2-E4', 'w:D2-D4'],
//         },
//       },
//     });

//     // Peer State Reconciliation and Action Fwd

//     expect(whiteActionFwd).toEqual(undefined);

//     expect(blackActionFwd).toEqual({
//       action: {
//         type: 'readySubmissionState',
//         payload: {
//           color: 'white',
//         },
//       },
//       checksum: expectedPeerState[1],
//     });

//     blackClientXResource.reconciliateAction(blackActionFwd!);

//     // The public action gets set

//     const actualPublic = await masterEnv.getPublic().resolveUnwrap();

//     // Master gets the new public state
//     expect(actualPublic).toEqual(expectedPublicState);

//     // Peer gets the new public state
//     expect(blackClientXResource.get()).toEqual(expectedPeerState);

//     // The Private Action gets set

//     // And sender gets the new private state
//     expect(whiteClientXResource.get()).toEqual(expectedSenderState);
//   });

//   test('Two Clients (white, black). Both Submitting (White first). WITHOUT Reconciliation', async () => {
//     const gameReducerWithoutRecociliation = gameReducer;

//     // Overwrite this to always return false in this test case
//     gameReducerWithoutRecociliation.$canReconcileState = () => {
//       return false;
//     };

//     const masterEnv = createMasterEnv({
//       store: localStore,
//       reducer: gameReducerWithoutRecociliation,
//       clientCountOrIdsAsString: ['white', 'black'],
//       rid,
//     });

//     const [whiteClient, blackClient] = masterEnv.clients;

//     const initialPublicState = await masterEnv.getPublic().resolveUnwrap();

//     const whiteClientXResource = new MovexClientResource(
//       gameReducer,
//       initialPublicState
//     );
//     const blackClientXResource = new MovexClientResource(
//       gameReducer,
//       initialPublicState
//     );

//     let whiteActionFwd:
//       | ToCheckedAction<GetReducerAction<typeof gameReducer>>
//       | undefined = undefined;
//     let blackActionFwd:
//       | ToCheckedAction<GetReducerAction<typeof gameReducer>>
//       | undefined = undefined;

//     // Bind the client udpates
//     whiteClient.onFwdAction((fwd) => {
//       whiteActionFwd = fwd;
//     });

//     blackClient.onFwdAction((fwd) => {
//       blackActionFwd = fwd;
//     });

//     // This could be part of the env (not just master env but client-master env)
//     //  because in reality this is part of the MovexClient
//     // Bind Action emitter to Master
//     whiteClientXResource.onDispatched((event) => {
//       whiteClient.emitAction(event.action);
//     });

//     blackClientXResource.onDispatched((event) => {
//       blackClient.emitAction(event.action);
//     });

//     // White's Turn
//     whiteClientXResource.dispatchPrivate(
//       {
//         type: 'submitMoves',
//         payload: {
//           color: 'white',
//           moves: ['w:E2-E4', 'w:D2-D4'],
//         },
//         isPrivate: true,
//       },
//       {
//         type: 'readySubmissionState',
//         payload: {
//           color: 'white',
//         },
//       }
//     );

//     await tillNextTick();

//     blackClientXResource.reconciliateAction(blackActionFwd!);

//     // Reset the Peer ActionFwd
//     blackActionFwd = undefined;

//     // Black's Turn

//     blackClientXResource.dispatchPrivate(
//       {
//         type: 'submitMoves',
//         payload: {
//           // How not to send the color here. is it even worth it?
//           // On argument is that the other player cna manipulat ethings, but if that's the case the whole game engine can be threatened
//           // Not worrking ab it for now
//           // Can get some token for {me} or smtg like that
//           color: 'black',
//           moves: ['b:E7-E6'],
//         },
//         isPrivate: true,
//       },
//       {
//         type: 'readySubmissionState',
//         payload: {
//           color: 'black',
//         },
//       }
//     );

//     await tillNextTick();

//     const expectedPublicState = computeCheckedState({
//       ...initialGameState,
//       submission: {
//         status: 'partial',
//         white: {
//           canDraw: false,
//           moves: [],
//         },
//         black: {
//           canDraw: false,
//           moves: [],
//         },
//       },
//     });

//     // White
//     const expectedPeerState = computeCheckedState({
//       ...initialGameState,
//       submission: {
//         status: 'partial',
//         white: {
//           canDraw: false,
//           moves: ['w:E2-E4', 'w:D2-D4'],
//         },
//         black: {
//           canDraw: false,
//           moves: [],
//         },
//       },
//     });

//     // Black
//     const expectedSenderState = computeCheckedState({
//       ...initialGameState,
//       submission: {
//         status: 'partial',
//         white: {
//           canDraw: false,
//           moves: [],
//         },
//         black: {
//           canDraw: false,
//           moves: ['b:E7-E6'],
//         },
//       },
//     });

//     // Peer State Reconciliation and Action Fwd

//     expect(blackActionFwd).toEqual(undefined);

//     expect(whiteActionFwd).toEqual({
//       action: {
//         type: 'readySubmissionState',
//         payload: {
//           color: 'black',
//         },
//       },
//       checksum: expectedPeerState[1],
//     });

//     whiteClientXResource.reconciliateAction(whiteActionFwd!);

//     // The public action gets set
//     const actualPublic = await masterEnv.getPublic().resolveUnwrap();

//     // Master gets the new public state
//     expect(actualPublic).toEqual(expectedPublicState);

//     // Peer gets the new public state
//     expect(whiteClientXResource.get()).toEqual(expectedPeerState);

//     // The Private Action gets set

//     // And sender gets the new private state
//     expect(blackClientXResource.get()).toEqual(expectedSenderState);
//   });

//   test('Two Clients. Both Submitting (White first) WITH Reconciliation', async () => {
//     const masterEnv = createMasterEnv({
//       store: localStore,
//       reducer: gameReducer,
//       clientCountOrIdsAsString: ['white', 'black'],
//       rid,
//     });

//     const [whiteClient, blackClient] = masterEnv.clients;

//     const initialPublicState = await masterEnv.getPublic().resolveUnwrap();

//     const whiteClientXResource = new MovexClientResource(
//       gameReducer,
//       initialPublicState
//     );
//     const blackClientXResource = new MovexClientResource(
//       gameReducer,
//       initialPublicState
//     );

//     let whiteActionFwd:
//       | ToCheckedAction<GetReducerAction<typeof gameReducer>>
//       | undefined = undefined;
//     let blackActionFwd:
//       | ToCheckedAction<GetReducerAction<typeof gameReducer>>
//       | undefined = undefined;

//     // Bind the client udpates
//     whiteClient.onFwdAction((fwd) => {
//       whiteActionFwd = fwd;
//     });

//     blackClient.onFwdAction((fwd) => {
//       blackActionFwd = fwd;
//     });

//     whiteClient.onReconciliatoryFwdActions((event) => {

//     })

//     // This could be part of the env (not just master env but client-master env)
//     //  because in reality this is part of the MovexClient
//     // Bind Action emitter to Master
//     whiteClientXResource.onDispatched((event) => {
//       whiteClient.emitAction(event.action);
//     });

//     blackClientXResource.onDispatched((event) => {
//       blackClient.emitAction(event.action);
//     });

//     // White's Turn
//     whiteClientXResource.dispatchPrivate(
//       {
//         type: 'submitMoves',
//         payload: {
//           color: 'white',
//           moves: ['w:E2-E4', 'w:D2-D4'],
//         },
//         isPrivate: true,
//       },
//       {
//         type: 'readySubmissionState',
//         payload: {
//           color: 'white',
//         },
//       }
//     );

//     await tillNextTick();

//     blackClientXResource.reconciliateAction(blackActionFwd!);

//     // Reset the Peer ActionFwd
//     blackActionFwd = undefined;

//     // Black's Turn

//     blackClientXResource.dispatchPrivate(
//       {
//         type: 'submitMoves',
//         payload: {
//           // How not to send the color here. is it even worth it?
//           // On argument is that the other player cna manipulat ethings, but if that's the case the whole game engine can be threatened
//           // Not worrking ab it for now
//           // Can get some token for {me} or smtg like that
//           color: 'black',
//           moves: ['b:E7-E6'],
//         },
//         isPrivate: true,
//       },
//       {
//         type: 'readySubmissionState',
//         payload: {
//           color: 'black',
//         },
//       }
//     );

//     await tillNextTick();

//     const expectedPublicState = computeCheckedState({
//       ...initialGameState,
//       submission: {
//         status: 'partial',
//         white: {
//           canDraw: false,
//           moves: [],
//         },
//         black: {
//           canDraw: false,
//           moves: [],
//         },
//       },
//     });

//     // White
//     const expectedPeerState = computeCheckedState({
//       ...initialGameState,
//       submission: {
//         status: 'partial',
//         white: {
//           canDraw: false,
//           moves: ['w:E2-E4', 'w:D2-D4'],
//         },
//         black: {
//           canDraw: false,
//           moves: [],
//         },
//       },
//     });

//     // Black
//     // const expectedSenderState = computeCheckedState({
//     //   ...initialGameState,
//     //   submission: {
//     //     status: 'partial',
//     //     white: {
//     //       canDraw: false,
//     //       moves: [],
//     //     },
//     //     black: {
//     //       canDraw: false,
//     //       moves: ['b:E7-E6'],
//     //     },
//     //   },
//     // });

//     // Peer State Reconciliation and Action Fwd

//     expect(blackActionFwd).toEqual(undefined);

//     expect(whiteActionFwd).toEqual({
//       action: {
//         type: 'readySubmissionState',
//         payload: {
//           color: 'black',
//         },
//       },
//       checksum: expectedPeerState[1],
//     });

//     whiteClientXResource.reconciliateAction(whiteActionFwd!);

//     // The public action gets set
//     const actualPublic = await masterEnv.getPublic().resolveUnwrap();

//     // Master gets the new public state
//     expect(actualPublic).toEqual(expectedPublicState);

//     // Peer gets the new public state
//     // expect(whiteClientXResource.get()).toEqual(expectedPeerState);
//     expect(whiteClientXResource.get()).toEqual(expectedPublicState);

//     // The Private Action gets set

//     // And sender gets the new private state
//     // expect(blackClientXResource.get()).toEqual(expectedSenderState);
//     expect(blackClientXResource.get()).toEqual(expectedPublicState);
//   });

//   // Test with many more peers
// });
