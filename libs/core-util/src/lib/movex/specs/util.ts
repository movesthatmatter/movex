import { Pubsy } from 'ts-pubsy';
import { StringKeys } from '../../core-types';
import { range } from '../../core-util';
import {
  ActionOrActionTuple,
  ActionsCollectionMapBase,
  AnyActionOf,
  CheckedState,
  Checksum,
  MovexReducerMap,
} from '../types';
import { computeCheckedState, getReducerApplicator, isAction } from '../util';

export const createMasterEnv = <
  TState,
  ActionsCollectionMap extends ActionsCollectionMapBase,
  TReducerMap extends MovexReducerMap<
    TState,
    ActionsCollectionMap
  > = MovexReducerMap<TState, ActionsCollectionMap>
>({
  genesisState,
  reducerMap,
  clientCount,
}: // networkLag = 0, // Default to no lag
{
  genesisState: TState;
  reducerMap: TReducerMap;
  clientCount: number;
  // networkLag: Number;
}) => {
  const stateUpdatePubsy = new Pubsy<{
    [key in `onDeprecatedNetworkExpensiveStateUpdateTo:${string}`]: CheckedState<TState>[1];
  }>();

  const actionPubsy = new Pubsy<{
    [key in `onFwdActionTo:${string}`]: {
      action: AnyActionOf<ActionsCollectionMap>;
      nextChecksum: Checksum;
    };
  }>();

  const store: { [k: string]: CheckedState<TState> } = {
    public: computeCheckedState(genesisState),
  };

  const toPrivateId = (id: string) => `private:${id}`;

  const get = (clientId: string) => {
    const privateKey = toPrivateId(clientId);

    if (store[privateKey]) {
      return store[privateKey];
    }

    return store.public;
  };

  const applyActionToReducer = getReducerApplicator<
    TState,
    ActionsCollectionMap
  >(reducerMap);

  const clientIds = range(clientCount).map((_, i) => `::client::${i}`);

  return {
    get,
    clients: clientIds.map((clientId) => {
      return {
        subscribeToMasterUpdates: (
          fn: (next: CheckedState<TState>[1]) => void
        ) =>
          stateUpdatePubsy.subscribe(
            `onDeprecatedNetworkExpensiveStateUpdateTo:${clientId}`,
            fn
          ),
        onFwdAction: (
          fn: (p: {
            action: AnyActionOf<ActionsCollectionMap>;
            nextChecksum: Checksum;
          }) => void
        ) => {
          return actionPubsy.subscribe(`onFwdActionTo:${clientId}`, fn);
        },
        emitAction: <TActionType extends StringKeys<ActionsCollectionMap>>(
          actionOrActionTuple: ActionOrActionTuple<
            TActionType,
            ActionsCollectionMap
          >
        ) => {
          // This is exactly what would happen on the backend so it could be re-used

          return new Promise<Checksum>((resolve) => {
            if (isAction(actionOrActionTuple)) {
              // If the action is public just apply it
              store.public = computeCheckedState(
                applyActionToReducer(store.public[0], actionOrActionTuple)
              );

              const nextChecksum = store.public[1];

              // Only send the checksum
              stateUpdatePubsy.publish(
                `onDeprecatedNetworkExpensiveStateUpdateTo:${clientId}`,
                nextChecksum
              );

              // Forward the action to all the clients except me
              clientIds
                .filter((cid) => cid !== clientId)
                .forEach((peerClientId) => {
                  actionPubsy.publish(`onFwdActionTo:${peerClientId}`, {
                    action: actionOrActionTuple,
                    nextChecksum,
                  });
                });

              // Ack the checksum
              resolve(nextChecksum);
            } else {
              // Otherwise apply them seperately
              const [privateAction, publicAction] = actionOrActionTuple;

              // Public Action

              // The next state from the public action foes into store.public
              store.public = computeCheckedState(
                applyActionToReducer(store.public[0], publicAction)
              );

              // Forward the pulic action to all the clients except me
              clientIds
                .filter((cid) => cid !== clientId)
                .forEach((peerClientId) => {
                  actionPubsy.publish(`onFwdActionTo:${peerClientId}`, {
                    action: publicAction,
                    nextChecksum: store.public[1],
                  });
                });

              // Private Action

              // If it already had a private state, it will get that
              //  otherwise it will get the public one
              const prevPublicOrPrivateState = get(clientId)[0];

              // The next state from the private action goes into the per client store
              store[toPrivateId(clientId)] = computeCheckedState(
                applyActionToReducer(prevPublicOrPrivateState, privateAction)
              );

              // Ack the checksum
              resolve(store[toPrivateId(clientId)][1]);
            }
          });
        },
      };
    }),
  };
};
