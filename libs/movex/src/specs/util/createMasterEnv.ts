// import { Pubsy } from 'ts-pubsy';
// import { range, StringKeys } from 'movex-core-util';
// import {
//   getStateDiff,
//   PrivateFragment,
//   reconciliatePrivateFragments,
//   computeCheckedState,
// } from '../../lib/util';
// import { CheckedState, MovexState } from '../../lib/core-types';
// import { ActionsCollectionMapBase, AnyCheckedAction } from '../../lib/tools/action';
// import { MovexReducerMap } from '../../lib/tools/reducer';
// // import {
// //   ActionOrActionTuple,
// //   ActionsCollectionMapBase,
// //   AnyCheckedAction,
// //   CheckedState,
// //   Checksum,
// //   MovexReducerMap,
// //   MovexState,
// // } from '../../lib/types';

// export const createMasterEnv = <
//   TState extends MovexState,
//   ActionsCollectionMap extends ActionsCollectionMapBase,
//   TReducerMap extends MovexReducerMap<
//     TState,
//     ActionsCollectionMap
//   > = MovexReducerMap<TState, ActionsCollectionMap>
// >({
//   genesisState,
//   reducerMap,
//   clientCountorIds,
// }: {
//   genesisState: TState;
//   reducerMap: TReducerMap;
//   clientCountorIds: number | string[];
// }) => {
//   const stateUpdatePubsy = new Pubsy<{
//     [key in `onDeprecatedNetworkExpensiveStateUpdateTo:${string}`]: CheckedState<TState>;
//   }>();

//   const actionPubsy = new Pubsy<{
//     [key in `onFwdActionTo:${string}`]: AnyCheckedAction<ActionsCollectionMap>;
//   }>();

//   type ClientId = string;

//   const store: {
//     public: CheckedState<TState>;
//     fragmentsByClient: {
//       [k in ClientId]: PrivateFragment[]; // The same user might have multiple fragments in order
//     };
//   } = {
//     public: computeCheckedState(genesisState),
//     fragmentsByClient: {},
//   };

//   // This gets the resource for each client
//   //  including the private fragments, which could result in different from each client or from pulic
//   const get = (clientId: string) => {
//     const privateFragments = store.fragmentsByClient[clientId];
//     if (privateFragments) {
//       // TODO: left it here!
//       // TODO: This needs some more thinking as some use cases don't work - like what if the public state has updated
//       // since the private diffs were created – how are they applied then? B/c the resulting might not work exactly
//       // There are different types of diff and I don't now what the consequences are for each – I don't see the whole picture,
//       //  in whih case I am "overwhelmed" at thinking of a solution w/o knowing them.
//       // In case the state has changed – I could run the patch on the Public 0 => resulting Public 0.5, then a patch at Public 1 over Public 0.5
//       //  if there are different (if the checksums don't match). In which case I could do something for each scenario
//       //    I guess the Public 1 overwrites the Public 0.5 in everything except for the paths it changed (the diff)
//       // return privateDiffs.reduce(() => {}, store.public)

//       // Should the checksum compute happen each time or should it be stored?
//       const reconciledState = reconciliatePrivateFragments(
//         store.public[0],
//         privateFragments
//       );

//       return computeCheckedState(reconciledState);
//     }

//     return store.public;
//   };

//   const applyActionToReducer = getReducerApplicator<
//     TState,
//     ActionsCollectionMap
//   >(reducerMap);

//   const clientIds = Array.isArray(clientCountorIds)
//     ? clientCountorIds
//     : range(clientCountorIds).map((_, i) => `::client::${i}`);

//   return {
//     get,
//     getPublic: () => {
//       return store.public;
//     },
//     clients: clientIds.map((clientId) => {
//       return {
//         subscribeToNetworkExpensiveMasterUpdates: (
//           fn: (next: CheckedState<TState>) => void
//         ) =>
//           stateUpdatePubsy.subscribe(
//             `onDeprecatedNetworkExpensiveStateUpdateTo:${clientId}`,
//             fn
//           ),
//         onFwdAction: (
//           fn: (p: AnyCheckedAction<ActionsCollectionMap>) => void
//         ) => {
//           return actionPubsy.subscribe(`onFwdActionTo:${clientId}`, fn);
//         },
//         emitAction: <TActionType extends StringKeys<ActionsCollectionMap>>(
//           actionOrActionTuple: ActionOrActionTuple<
//             TActionType,
//             ActionsCollectionMap
//           >
//         ) => {
//           // This is exactly what would happen on the backend so it could be re-used

//           return new Promise<Checksum>((resolve) => {
//             if (isAction(actionOrActionTuple)) {
//               // If the action is public just apply it
//               store.public = computeCheckedState(
//                 applyActionToReducer(store.public[0], actionOrActionTuple)
//               );

//               const nextChecksum = store.public[1];

//               // Forward the action to all the clients except me
//               clientIds
//                 .filter((cid) => cid !== clientId)
//                 .forEach((peerClientId) => {
//                   stateUpdatePubsy.publish(
//                     `onDeprecatedNetworkExpensiveStateUpdateTo:${peerClientId}`,
//                     store.public
//                   );

//                   actionPubsy.publish(`onFwdActionTo:${peerClientId}`, {
//                     action: actionOrActionTuple,
//                     checksum: nextChecksum,
//                   });
//                 });

//               // Ack the checksum
//               resolve(nextChecksum);
//             } else {
//               // Otherwise apply them seperately
//               const [privateAction, publicAction] = actionOrActionTuple;

//               // Private Action
//               // This is first b/c it needs to get the prev public state (unmodified by the public action)

//               // If it already had a private state, it will get that
//               //  otherwise it will get the public one
//               const prevPublicOrPrivateState = get(clientId)[0];

//               const nextPrivateState = applyActionToReducer(
//                 prevPublicOrPrivateState,
//                 privateAction
//               );

//               const publicPrivateDiff = getStateDiff(
//                 prevPublicOrPrivateState,
//                 nextPrivateState
//               );

//               // The next state from the private action goes into the per client store
//               // computeCheckedState(
//               //   applyActionToReducer(prevPublicOrPrivateState, privateAction)
//               // );
//               store.fragmentsByClient[clientId] = store.fragmentsByClient[
//                 clientId
//               ]
//                 ? [...store.fragmentsByClient[clientId], publicPrivateDiff]
//                 : [publicPrivateDiff];

//               // Public Action
//               // The next state from the public action goes into store.public
//               store.public = computeCheckedState(
//                 applyActionToReducer(store.public[0], publicAction)
//               );

//               // Forward the public action to all the clients except me
//               clientIds
//                 .filter((cid) => cid !== clientId)
//                 .forEach((peerClientId) => {
//                   const peerClientState = get(peerClientId);

//                   stateUpdatePubsy.publish(
//                     `onDeprecatedNetworkExpensiveStateUpdateTo:${peerClientId}`,
//                     peerClientState
//                   );

//                   actionPubsy.publish(`onFwdActionTo:${peerClientId}`, {
//                     action: publicAction,
//                     checksum: peerClientState[1],
//                   });
//                 });

//               // Ack the checksum from the private action
//               resolve(get(clientId)[1]);
//             }
//           });
//         },
//       };
//     }),
//   };
// };
