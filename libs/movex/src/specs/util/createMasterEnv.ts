import { Pubsy } from 'ts-pubsy';
import {
  AnyResourceIdentifier,
  MovexStore,
  range,
  toResourceIdentifierStr,
} from 'movex-core-util';
import { CheckedState } from '../../lib/core-types';
import {
  ActionOrActionTupleFromAction,
  AnyAction,
  ToCheckedAction,
} from '../../lib/tools/action';
import { MovexReducer } from '../../lib/tools/reducer';
import { MovexMaster } from '../../lib/MovexMaster';

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

  const actionPubsy = new Pubsy<{
    [key in `onFwdActionTo:${string}`]: ToCheckedAction<TAction>;
  }>();

  type ClientId = string;

  // const store: {
  //   public: CheckedState<TState>;
  //   fragmentsByClient: {
  //     // TODO: This should contain the private action as well as the private state so it can then be forwaarded
  //     // to the rest of the clients!
  //     [k in ClientId]: JsonPatch<TState>[]; // The same user might have multiple fragments in order
  //   };
  // } = {
  //   public: computeCheckedState(genesisState),
  //   fragmentsByClient: {},
  // };

  // This gets the resource for each client
  //  including the private fragments, which could result in different from each client or from pulic
  // const get = (clientId: string) => {
  //   const privateFragments = store.fragmentsByClient[clientId];
  //   if (privateFragments) {
  //     // TODO: left it here!
  //     // TODO: This needs some more thinking as some use cases don't work - like what if the public state has updated
  //     // since the private diffs were created – how are they applied then? B/c the resulting might not work exactly
  //     // There are different types of diff and I don't now what the consequences are for each – I don't see the whole picture,
  //     //  in whih case I am "overwhelmed" at thinking of a solution w/o knowing them.
  //     // In case the state has changed – I could run the patch on the Public 0 => resulting Public 0.5, then a patch at Public 1 over Public 0.5
  //     //  if there are different (if the checksums don't match). In which case I could do something for each scenario
  //     //    I guess the Public 1 overwrites the Public 0.5 in everything except for the paths it changed (the diff)
  //     // return privateDiffs.reduce(() => {}, store.public)

  //     // Should the checksum compute happen each time or should it be stored?
  //     const reconciledState = reconciliatePrivateFragments(
  //       store.public[0],
  //       privateFragments
  //     );

  //     return computeCheckedState(reconciledState);
  //   }

  //   return store.public;
  // };

  // const reconciliatePublicState = () => {
  //   const allClientsPrivateFragments = objectKeys(
  //     store.fragmentsByClient
  //   ).reduce((accum, next) => {
  //     // console.group('private fragments for', next);
  //     // console.log(store.fragmentsByClient[next]);
  //     // console.groupEnd();

  //     // Here we need to take in account the order probably the saved order
  //     return [...accum, ...store.fragmentsByClient[next]];
  //   }, [] as JsonPatch<TState>[]);

  //   if (allClientsPrivateFragments) {
  //     const reconciledState = reconciliatePrivateFragments(
  //       store.public[0],
  //       allClientsPrivateFragments
  //     );

  //     // Save the new state!
  //     store.public = computeCheckedState(reconciledState);

  //     // Reset the fragments
  //     store.fragmentsByClient = {};
  //   }

  //   return store.public;
  // };

  const clientIds = Array.isArray(clientCountOrIds)
    ? clientCountOrIds
    : range(clientCountOrIds).map((_, i) => `::client::${i}`);

  const master = new MovexMaster(reducer, store);

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
          return actionPubsy.subscribe(`onFwdActionTo:${clientId}`, fn);
        },
        emitAction: (
          actionOrActionTuple: ActionOrActionTupleFromAction<TAction>
        ) => {
          // All
          return master
            .applyAction(rid, clientId, actionOrActionTuple)
            .mapErr((e) => {
              console.log('in master nev emit action apply action e', e);
            })
            .map(({ nextPublic, nextPrivate }) => {
              // Forward the Public Action to all the clients except me
              clientIds
                .filter((cid) => cid !== clientId)
                .forEach((peerClientId) => {
                  stateUpdatePubsy.publish(
                    `onDeprecatedNetworkExpensiveStateUpdateTo:${peerClientId}`,
                    nextPublic.item.state
                  );

                  actionPubsy.publish(`onFwdActionTo:${peerClientId}`, {
                    action: nextPublic.action,
                    checksum: nextPublic.item.state[1],
                  });
                });

              const ack = nextPrivate
                ? nextPrivate.item.state[1]
                : nextPublic.item.state[1];

              return ack;
            });

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
