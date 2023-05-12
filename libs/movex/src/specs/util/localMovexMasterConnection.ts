// import {
//   AnyResourceIdentifier,
//   getRandomInt,
//   MovexClient,
// } from 'movex-core-util';
// import { AsyncResult } from 'ts-async-results';
// import { Pubsy } from 'ts-pubsy';
// import { MovexIO } from '../../lib/IMovexIO';
// import { MovexMaster } from '../../lib/master/MovexMaster';
// import { MovexMasterResource } from '../../lib/master/MovexMasterResource';
// import {
//   ActionOrActionTupleFromAction,
//   AnyAction,
//   ToCheckedAction,
// } from '../../lib/tools/action';

// export class MovexLocalIOClient<TState, TAction extends AnyAction>
//   implements MovexIO
// {
//   private connectionPubsy = new Pubsy<{
//     connect: { clientId: string };
//     disconnect: undefined;
//   }>();

//   clientId: MovexClient['id'];

//   constructor(
//     private masterResource: MovexMasterResource<TState, TAction>,
//     private rid: AnyResourceIdentifier,
//     clientId: string = `client-${getRandomInt(0, 999999)}`
//   ) {
//     this.clientId = clientId;
//   }

//   connect() {
//     // Nothing to do here
//   }

//   disconnect() {
//     // Nothing to do here
//   }

//   onConnect(fn: (p: { clientId: MovexClient['id'] }) => void) {
//     return this.connectionPubsy.subscribe('connect', fn);
//   }

//   onDisconnect(fn: () => void) {
//     return this.connectionPubsy.subscribe('disconnect', fn);
//   }

//   emitAction(actionOrActionTuple: ActionOrActionTupleFromAction<TAction>) {
//     // AsyncResult<Checksum, unknown>; // Returns the Ack Checksum

//     return this.masterResource
//       .applyAction(this.rid, this.clientId, actionOrActionTuple)
//       .flatMap(
//         ({ nextPublic, nextPrivate, reconciliatoryActionsByClientId }) => {
//           const peerStateResults = clientIds
//             .filter((cid) => cid !== clientId)
//             .map((peerClientId) =>
//               master
//                 .get(rid, peerClientId)
//                 .map((state) => ({ clientId: peerClientId, state }))
//             );

//           return AsyncResult.all(...peerStateResults)
//             .map((peerState) => {
//               peerState.forEach((peer) => {
//                 stateUpdatePubsy.publish(
//                   `onDeprecatedNetworkExpensiveStateUpdateTo:${peer.clientId}`,
//                   peer.state
//                 );

//                 if (reconciliatoryActionsByClientId) {
//                   reconciliatryActionsPubsy.publish(
//                     `onReconciliatoryFwdActionsTo:${peer.clientId}`,
//                     reconciliatoryActionsByClientId[peer.clientId]
//                   );
//                 } else {
//                   // I think this should be here
//                   actionPubsy.publish(`onFwdActionTo:${peer.clientId}`, {
//                     action: nextPublic.action,
//                     checksum: peer.state[1],
//                   });
//                 }
//               });
//             })
//             .map(() => {
//               const ack = nextPrivate
//                 ? nextPrivate.checksum
//                 : nextPublic.checksum;

//               return ack;
//             });

//           // Forward the Public Action to all the clients except me
//           // clientIds
//           //   .filter((cid) => cid !== clientId)
//           //   .forEach((peerClientId) => {
//           //     stateUpdatePubsy.publish(
//           //       `onDeprecatedNetworkExpensiveStateUpdateTo:${peerClientId}`,
//           //       nextPublic.item.state
//           //     );

//           //     actionPubsy.publish(`onFwdActionTo:${peerClientId}`, {
//           //       action: nextPublic.action,
//           //       checksum: nextPublic.item.state[1],
//           //     });
//           //   });
//         }
//       );
//   }

//   onFwdAction(fn: (p: ToCheckedAction<TAction>) => void) {}

//   // onReconciliatoryActions(
//   //   fn: (p: CheckedReconciliatoryActions<TAction>) => void
//   // ): UnsubscribeFn;

//   // This should know hot to use the ClientId at implementatino level
//   get() {
//     return this.master.get(this.rid, this.clientId);
//   }
// }
