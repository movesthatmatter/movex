// import { tillNextTick, toResourceIdentifierStr } from 'movex-core-util';
// import { MovexClientResource } from '../lib/MovexClientResource';
// import { computeCheckedState } from '../lib/util';
// import gameReducer, { initialGameState } from './util/gameReducer';
// import { createMasterEnv } from './util/createMasterEnv';
// import { LocalMovexStore } from '../lib/master-store';
// import { GetReducerAction, GetReducerState } from '../lib/tools/reducer';
// import { ToCheckedAction } from '../lib/tools/action';
// require('console-group').install();

// const rid = toResourceIdentifierStr({
//   resourceType: 'game',
//   resourceId: 'test',
// });

// const localStore = new LocalMovexStore<GetReducerState<typeof gameReducer>>();

// beforeEach(async () => {
//   await localStore.clearAll().resolveUnwrap();

//   await localStore.create(rid, initialGameState).resolveUnwrap();
// });

// describe('Public Actions', () => {
//   test('With 2 Clients', async () => {
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

//     blackClient.onFwdAction((fwd) => {
//       const result = blackClientXResource.reconciliateAction(fwd);

//       expect(result.ok).toBe(true);
//     });

//     whiteClientXResource.onDispatched((event) => {
//       whiteClient.emitAction(event.action);
//     });

//     blackClientXResource.onDispatched((event) => {
//       blackClient.emitAction(event.action);
//     });

//     whiteClientXResource.dispatch({
//       type: 'change',
//       payload: 5,
//     });

//     await tillNextTick();

//     const expectedMasterPublicState = computeCheckedState({
//       ...initialGameState,
//       count: 5,
//     });

//     const actualPublicState = await masterEnv.getPublic().resolveUnwrap();

//     expect(actualPublicState).toEqual(expectedMasterPublicState);

//     expect(whiteClientXResource.get()).toEqual(expectedMasterPublicState);

//     // And even the peer client got the next state! Yey!
//     expect(blackClientXResource.get()).toEqual(expectedMasterPublicState);
//   });
// });

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
