import { Pubsy } from 'ts-pubsy';
import { AnyResourceIdentifier, MovexStore, range } from 'movex-core-util';
import { CheckedState, Checksum } from '../../lib/core-types';
import {
  ActionOrActionTupleFromAction,
  AnyAction,
  CheckedReconciliatoryActions,
  ToCheckedAction,
} from '../../lib/tools/action';
import { MovexReducer } from '../../lib/tools/reducer';
import { MovexMasterResource } from '../../lib/master/MovexMasterResource';
import { AsyncResult } from 'ts-async-results';

export const createMasterEnv = <TState, TAction extends AnyAction>({
  store,
  reducer,
  clientCountOrIdsAsString,
  rid,
}: {
  store: MovexStore<TState>;
  reducer: MovexReducer<TState, TAction>;
  clientCountOrIdsAsString: number | string[];
  rid: AnyResourceIdentifier;
}) => {
  const clientCountOrIds = clientCountOrIdsAsString;

  const stateUpdatePubsy = new Pubsy<{
    [key in `onDeprecatedNetworkExpensiveStateUpdateTo:${string}`]: CheckedState<TState>;
  }>();

  const fwdActionPubsy = new Pubsy<{
    [key in `onFwdActionTo:${string}`]: ToCheckedAction<TAction>;
  }>();

  const reconciliatryActionsPubsy = new Pubsy<{
    [key in `onReconciliatoryFwdActionsTo:${string}`]: CheckedReconciliatoryActions<TAction>;
  }>();

  type ClientId = string;

  const clientIds = Array.isArray(clientCountOrIds)
    ? clientCountOrIds
    : range(clientCountOrIds).map((_, i) => `::client::${i}`);

  const master = new MovexMasterResource(reducer, store);

  return {
    rid,
    get: (clientId: ClientId) => master.get(rid, clientId),
    getPublic: () => master.getPublic(rid),
    master,
    clients: clientIds.map((clientId) => {
      return {
        subscribeToNetworkExpensiveMasterUpdates: (
          fn: (next: CheckedState<TState>) => void
        ) =>
          stateUpdatePubsy.subscribe(
            `onDeprecatedNetworkExpensiveStateUpdateTo:${clientId}`,
            fn
          ),
        onFwdAction: (fn: (p: ToCheckedAction<TAction>) => void) => {
          return fwdActionPubsy.subscribe(`onFwdActionTo:${clientId}`, fn);
        },
        onReconciliatoryFwdActions: (
          fn: (p: CheckedReconciliatoryActions<TAction>) => void
        ) => {
          return reconciliatryActionsPubsy.subscribe(
            `onReconciliatoryFwdActionsTo:${clientId}`,
            fn
          );
        },
        emitAction: (
          actionOrActionTuple: ActionOrActionTupleFromAction<TAction>
        ) => {
          // All
          return master
            .applyAction(rid, clientId, actionOrActionTuple)
            .flatMap(
              ({
                nextPublic,
                nextPrivate,
                reconciliatoryActionsByClientId,
              }) => {
                const peerStateResults = clientIds
                  .filter((cid) => cid !== clientId)
                  .map((peerClientId) =>
                    master
                      .get(rid, peerClientId)
                      .map((state) => ({ clientId: peerClientId, state }))
                  );

                return AsyncResult.all(...peerStateResults)
                  .map((peerState) => {
                    peerState.forEach((peer) => {
                      stateUpdatePubsy.publish(
                        `onDeprecatedNetworkExpensiveStateUpdateTo:${peer.clientId}`,
                        peer.state
                      );

                      if (reconciliatoryActionsByClientId) {
                        reconciliatryActionsPubsy.publish(
                          `onReconciliatoryFwdActionsTo:${peer.clientId}`,
                          reconciliatoryActionsByClientId[peer.clientId]
                        );
                      } else {
                        // I think this should be here
                        fwdActionPubsy.publish(`onFwdActionTo:${peer.clientId}`, {
                          action: nextPublic.action,
                          checksum: peer.state[1],
                        });
                      }
                    });
                  })
                  .map(() => {
                    const ack = nextPrivate
                      ? nextPrivate.checksum
                      : nextPublic.checksum;

                    return ack;
                  });

                // Forward the Public Action to all the clients except me
                // clientIds
                //   .filter((cid) => cid !== clientId)
                //   .forEach((peerClientId) => {
                //     stateUpdatePubsy.publish(
                //       `onDeprecatedNetworkExpensiveStateUpdateTo:${peerClientId}`,
                //       nextPublic.item.state
                //     );

                //     actionPubsy.publish(`onFwdActionTo:${peerClientId}`, {
                //       action: nextPublic.action,
                //       checksum: nextPublic.item.state[1],
                //     });
                //   });
              }
            );

          // This is exactly what would happen on the backend so it could be re-used

          // const handlePublicAction = (
          //   nextPublicCheckedState: CheckedState<TState>,
          //   action: TAction
          // ) => {
          //   store.public = nextPublicCheckedState;

          //   const nextChecksum = store.public[1];

          //   // Forward the action to all the clients except me
          //   clientIds
          //     .filter((cid) => cid !== clientId)
          //     .forEach((peerClientId) => {
          //       stateUpdatePubsy.publish(
          //         `onDeprecatedNetworkExpensiveStateUpdateTo:${peerClientId}`,
          //         store.public
          //       );

          //       actionPubsy.publish(`onFwdActionTo:${peerClientId}`, {
          //         action,
          //         checksum: nextChecksum,
          //       });
          //     });

          //   return nextChecksum;
          // };

          // return new Promise<Checksum>((resolve) => {
          //   if (isAction(actionOrActionTuple)) {
          //     // Ack the checksum
          //     return resolve(
          //       handlePublicAction(
          //         computeCheckedState(
          //           reducer(store.public[0], actionOrActionTuple)
          //         ),
          //         actionOrActionTuple
          //       )
          //     );
          //   }

          //   // Private Action
          //   // Otherwise apply them seperately
          //   const [privateAction, publicAction] = actionOrActionTuple;

          //   // If it has private actions it must have $canReconcileState defined!
          //   // TODO: This can be enforced in MovexResouce as well on dispatchPrivate
          //   if (!reducer.$canReconcileState) {
          //     throw new Error('Reducer.$canReconcileState not defined!');
          //   }

          //   // Private Action
          //   // This is first b/c it needs to get the prev public state (unmodified by the public action)

          //   // If it already had a private state, it will get that
          //   //  otherwise it will get the public one
          //   const prevPublicOrPrivateState = get(clientId)[0];

          //   const nextPrivateState = reducer(
          //     prevPublicOrPrivateState,
          //     privateAction
          //   );

          //   const publicPrivateDiff = getStateDiff(
          //     prevPublicOrPrivateState,
          //     nextPrivateState
          //   );

          //   // The next state from the private action goes into the per client store
          //   // computeCheckedState(
          //   //   applyActionToReducer(prevPublicOrPrivateState, privateAction)
          //   // );
          //   store.fragmentsByClient[clientId] = store.fragmentsByClient[
          //     clientId
          //   ]
          //     ? [...store.fragmentsByClient[clientId], publicPrivateDiff]
          //     : [publicPrivateDiff];

          //   console.group('dispatched private', clientId);
          //   console.log('action', privateAction);
          //   console.log(store.fragmentsByClient[clientId]);
          //   console.groupEnd();

          //   // Public Action
          //   // The next state from the public action goes into store.public
          //   store.public = computeCheckedState(
          //     reducer(store.public[0], publicAction)
          //   );

          //   // Reconciliation Check

          //   const canReconciliate = reducer.$canReconcileState(store.public[0]);
          //   console.log('canReconciliate', canReconciliate);

          //   if (canReconciliate) {
          //     reconciliatePublicState();

          //     // Here I need to send all of the private actions to the other peers
          //     console.group('after reconciliation');
          //     console.log('store', store);
          //     console.log(
          //       'store.public[0]',
          //       (store.public[0] as any).submission
          //     );
          //     console.log((get(clientId)[0] as any).submission);
          //     console.groupEnd();
          //     // return resolve(get(clientId)[1]);
          //     // return resolve(store.public[1]);
          //   }

          //   handlePublicAction(store.public, publicAction);

          //   // Forward the public action to all the clients except me
          //   // clientIds
          //   //   .filter((cid) => cid !== clientId)
          //   //   .forEach((peerClientId) => {
          //   //     const peerClientState = get(peerClientId);

          //   //     stateUpdatePubsy.publish(
          //   //       `onDeprecatedNetworkExpensiveStateUpdateTo:${peerClientId}`,
          //   //       peerClientState
          //   //     );

          //   //     actionPubsy.publish(`onFwdActionTo:${peerClientId}`, {
          //   //       action: publicAction,
          //   //       checksum: peerClientState[1],
          //   //     });
          //   //   });

          //   // Ack the checksum from the private action
          //   resolve(get(clientId)[1]);
          // });
        },
      };
    }),
  };
};
