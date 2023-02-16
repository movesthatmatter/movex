import { GenericResource, ResourceIdentifier, StringKeys } from '../core-types';
import {
  delay,
  getResourceRId,
  noop,
  range,
  toResourceIdentifierStr,
} from '../core-util';
import { createDispatcher } from './resource-reducer';
import {
  Action,
  ActionOrActionTuple,
  ActionsCollectionMapBase,
  PrivateAction,
  PublicAction,
  ResourceAndChecksum,
  ResourceReducerMap,
  StateAndChecksum,
  ValAndChecksum,
} from './types';
import * as deepObject from 'deep-object-diff';
import { hashObject } from './util';
import deepClone from 'deep-clone';
import { Observable } from '../core-util/Observable';
import { Pubsy } from 'ts-pubsy';

export const createMasterEnvironment = <
  TResource extends GenericResource,
  ActionsCollectionMap extends ActionsCollectionMapBase,
  TReducerMap extends ResourceReducerMap<
    TResource,
    ActionsCollectionMap
  > = ResourceReducerMap<TResource, ActionsCollectionMap>
>(p: {
  clientCount: number;
  resource: TResource;
  reducerMap: TReducerMap;
}) => {
  const toPublicRId = (rId: ResourceIdentifier<TResource['type']>) =>
    `${toResourceIdentifierStr(rId)}`;
  const toPrivateRId = (
    rId: ResourceIdentifier<TResource['type']>,
    clientId: string
  ) => `${toResourceIdentifierStr(rId)}::${clientId}`;

  // const initialResourceAndChecksum = ;

  let store = {
    [toPublicRId(getResourceRId(p.resource))]: {
      resource: p.resource,
      checksum: hashObject(p.resource.item),
    },
  };

  const getResourceObj = (clientId: string) => {
    return (
      store[toPrivateRId(getResourceRId(p.resource), clientId)] ||
      store[toPublicRId(getResourceRId(p.resource))]
    );

    // console.log('got resourcee', clientId, x);

    // return x;
  };

  const getPrivateResourceObj = (clientId: string) => {
    // console.debug('store', store);
    return store[toPrivateRId(getResourceRId(p.resource), clientId)];
  };

  // const getPrivateResourceObjOrThrow = (clientId: string) => {
  //   const r = getPrivateResourceObj(clientId);

  //   if (!r) {
  //     throw `Private Resource for ${clientId} Does NOT Exist!`;
  //   }

  //   return r;
  // };

  return {
    // This simulates the way the private resources gets retrieved
    getResourceObj,
    getPrivateResourceObj,
    getPublicResourceObj: () => store[toPublicRId(getResourceRId(p.resource))],
    clients: range(p.clientCount)
      .map((_, i) => `_client:${i + 1}`)
      .map((clientId) => {
        // $resourceAndChecksum.onUpdate((nextState) => {
        //   console.debug('$resource updated for', clientId, nextState.resource.id, 'to:');
        //   console.debug(nextState.resource);
        // })

        // function dispatch<TActionType extends StringKeys<ActionsCollectionMap>>(
        //   publicAction: Action<TActionType, ActionsCollectionMap[TActionType]>
        // ): void;
        // function dispatch<TActionType extends StringKeys<ActionsCollectionMap>>(
        //   privateAction: PrivateAction<
        //     TActionType,
        //     ActionsCollectionMap[TActionType]
        //   >,
        //   publicAction?: PublicAction<
        //     TActionType,
        //     ActionsCollectionMap[TActionType]
        //   >
        // ): void;
        // function dispatch<TActionType extends StringKeys<ActionsCollectionMap>>(
        //   publicOrPrivateAction: Action<
        //     TActionType,
        //     ActionsCollectionMap[TActionType]
        //   >,
        //   publicAction?: PublicAction<
        //     TActionType,
        //     ActionsCollectionMap[TActionType]
        //   >
        // ) {
        //   // console.log(
        //   //   'client',
        //   //   clientId,
        //   //   'master dispatching',
        //   //   publicOrPrivateAction.type,
        //   //   publicAction ? publicAction.type : ''
        //   // );

        //   // This simulates the Matterio (Store), it returns either the private or the public

        //   // This needs to get recreate each time the client calls it to be stateless
        //   //  it could be memoized or smtg like that in prod
        //   const localDispatch = createDispatcher<
        //     TResource,
        //     ActionsCollectionMap
        //   >($resourceAndChecksum, p.reducerMap, {
        //     onDispatched: (next, prev, action) => {
        //       const prevStore = deepClone(store);

        //       console.debug('client On Dispathced', clientId, '');

        //       return;

        //       // TODO: Fix this - it never gets called
        //       // console.log(
        //       //   'client',
        //       //   clientId,
        //       //   'master dispatching',
        //       //   'on dispatched called for',
        //       //   action.type,
        //       //   action
        //       // );

        //       // console.log('store', store);

        //       const updateAndGetNextResourceAndChecksum = () => {
        //         if (action.isPrivate) {
        //           const rid = toPrivateRId(
        //             getResourceRId(p.resource),
        //             clientId
        //           );

        //           const nextState = {
        //             resource: {
        //               ...p.resource,
        //               item: next.state,
        //             },
        //             checksum: next.checksum,
        //           };

        //           store = {
        //             ...store,
        //             [rid]: nextState,
        //           };

        //           return nextState;

        //           // This gets called by the backend after each private action
        //           // if (
        //           //   reducerMap.$canReconcile?.(nextState, {
        //           //     type: '$canReconcile',
        //           //     payload: undefined,
        //           //   })
        //           // ) {
        //           //   // Reconcile the actions
        //         } else {
        //           const rid = toPublicRId(getResourceRId(p.resource));

        //           const nextState = {
        //             ...store[rid],
        //             resource: {
        //               ...store[rid].resource,
        //               item: next.state,
        //             },
        //             checksum: next.checksum,
        //           };
        //           // If it's public, update the public state
        //           store[rid] = nextState;

        //           return nextState;
        //         }
        //       };

        //       // Simulate the updating on the server
        //       const nextState = updateAndGetNextResourceAndChecksum();

        //       console.debug('going to update $resource for', clientId, 'to:');
        //       console.debug(next.state);
        //       $resourceAndChecksum.update(nextState);

        //       console.group(
        //         'Action',
        //         action.isPrivate ? '(Private)' : '',
        //         action.type
        //       );
        //       console.log('Payload:', action.payload);
        //       console.log('Prev State:', prev.state);
        //       console.log('Next State:', next.state);
        //       console.log(
        //         'Diff:',
        //         JSON.stringify(
        //           deepObject.detailedDiff(prev.state, next.state),
        //           null,
        //           2
        //         )
        //       );
        //       console.log('Checksums:', prev.checksum, '>', next.checksum);
        //       console.log();
        //       console.log(
        //         'Prev Master State',
        //         JSON.stringify(prevStore, null, 2)
        //       );
        //       console.log('Next Master State', JSON.stringify(store, null, 2));
        //       console.log();
        //       console.groupEnd();
        //     },
        //   });

        //   return localDispatch(publicOrPrivateAction as any, publicAction);
        // }

        const $resourceAndChecksum = new Observable<
          ResourceAndChecksum<TResource>
        >(getResourceObj(clientId));

        // const dispatchToMaster = ;

        const pubsy = new Pubsy<{
          onResourceUpdated: ResourceAndChecksum<TResource>;
        }>();

        return {
          clientId,
          $resourceAndChecksum: $resourceAndChecksum,
          subscribeToMasterResourceUpdates: (
            fn: (r: ResourceAndChecksum<TResource>) => void
          ) => pubsy.subscribe('onResourceUpdated', fn),
          emitActionToMaster: <
            TActionType extends StringKeys<ActionsCollectionMap>
          >(
            actionOrActionType: ActionOrActionTuple<
              TActionType,
              ActionsCollectionMap
            >
          ) => {
            new Promise((resolveAck) => {
              const dispatch = createDispatcher<
                TResource,
                ActionsCollectionMap
              >($resourceAndChecksum, p.reducerMap, {
                onDispatched: (next, prev, action) => {
                  const prevStore = deepClone(store);

                  // TODO: Fix this - it never gets called
                  // console.log(
                  //   'client',
                  //   clientId,
                  //   'master dispatching',
                  //   'on dispatched called for',
                  //   action.type,
                  //   action
                  // );

                  // console.log('store', store);

                  const updateStore = () => {
                    if (action.isPrivate) {
                      const rid = toPrivateRId(
                        getResourceRId(p.resource),
                        clientId
                      );

                      const nextState = {
                        resource: {
                          ...p.resource,
                          item: next.state,
                        },
                        checksum: next.checksum,
                      };

                      store = {
                        ...store,
                        [rid]: nextState,
                      };

                      // return nextState;

                      // This gets called by the backend after each private action
                      // if (
                      //   reducerMap.$canReconcile?.(nextState, {
                      //     type: '$canReconcile',
                      //     payload: undefined,
                      //   })
                      // ) {
                      //   // Reconcile the actions
                    } else {
                      const rid = toPublicRId(getResourceRId(p.resource));

                      const nextState = {
                        ...store[rid],
                        resource: {
                          ...store[rid].resource,
                          item: next.state,
                        },
                        checksum: next.checksum,
                      };
                      // If it's public, update the public state
                      store[rid] = nextState;

                      // return nextState;
                    }
                  };

                  // Simulate the updating on the server
                  // TODO: This should be sent to the client only on the private not on the public when there are 2
                  // const nextState = updateAndGetNextResourceAndChecksum();
                  updateStore();

                  // const nextState = getResourceObj(clientId);

                  // $resourceAndChecksum.update(nextState);
                  // This will return what this particular client should see

                  console.group(
                    'Action',
                    `(client: ${clientId})`,
                    action.isPrivate ? '(Private)' : '',
                    action.type
                  );
                  console.log('Payload:', action.payload);
                  console.log('Prev State:', prev.state);
                  console.log('Next State:', next.state);
                  console.log(
                    'Diff:',
                    JSON.stringify(
                      deepObject.detailedDiff(prev.state, next.state),
                      null,
                      2
                    )
                  );
                  console.log('Checksums:', prev.checksum, '>', next.checksum);
                  // console.log(
                  //   'Prev Master State',
                  //   JSON.stringify(prevStore, null, 2)
                  // );
                  // console.log(
                  //   'Next Master State',
                  //   JSON.stringify(store, null, 2)
                  // );
                  console.groupEnd();
                  console.log();
                  console.log();


                  const nextState = getResourceObj(clientId);
                  console.debug('going to update pubsy', nextState.resource, nextState.checksum);

                  pubsy.publish('onResourceUpdated', nextState);
                },
              });

              dispatch(actionOrActionType);
            });
          },
          // getMasterPrivateResourceIfExists: () =>
          //   store[toPrivateRId(getResourceRId(p.resource), clientId)],
          // getMasterPrivateResourceOrThrow: () => {
          //   const x = store[toPrivateRId(getResourceRId(p.resource), clientId)];

          //   if (!x) {
          //     throw `Privte Resource for ${clientId} Does NOT Exist!`;
          //   }

          //   // console.log('herer', x);
          //   return x;
          // },
          // () => {
          //   // In the real world this dispatcher does get created each time
          //   //  But it could also be optimized probably with cache/memoizer

          // },
        };
      }),
  };
};

export const createClientEnvironment = <
  TResource extends GenericResource,
  ActionsCollectionMap extends ActionsCollectionMapBase,
  TReducerMap extends ResourceReducerMap<
    TResource,
    ActionsCollectionMap
  > = ResourceReducerMap<TResource, ActionsCollectionMap>
>(
  client: Pick<
    ReturnType<typeof createMasterEnvironment>['clients'][0],
    'clientId' | 'emitActionToMaster' | 'subscribeToMasterResourceUpdates'
  >,
  // This gets changed in place
  // $resource: Observable<ResourceAndChecksum<TResource>>,
  resourceAndChecksum: ResourceAndChecksum<TResource>,
  // storeRef: {
  // },
  // getResourceObj: (clientId: string) => ResourceAndChecksum<TResource>,
  reducerMap: TReducerMap,
  {
    onDispatched = noop,
    NETWORK_LAG_MS = 100,
  }: {
    onDispatched?: (
      next: StateAndChecksum<TResource['item']>,
      prev: StateAndChecksum<TResource['item']>
    ) => void;
    NETWORK_LAG_MS?: number;
  }
) => {
  // These get changed in place so they can easily be tested from outside
  // const initialResourceObj = getResourceObj(client.clientId);

  const store = {
    current: {
      state: resourceAndChecksum.resource.item,
      checksum: resourceAndChecksum.checksum,
    },

    // get current() {
    //   return this._current;
    // },

    // get currentChecksum() {
    //   return this._currentChecksum;
    // },
  };

  const $resourceAndChecksum = new Observable(resourceAndChecksum);

  // $resource.onUpdate((next) => {
  client.subscribeToMasterResourceUpdates((next) => {
    console.debug('client.subscribeToMasterResourceUpdates', client.clientId, next);

    if (
      // next.resource.item === store.current.state ||
      next.checksum === store.current.checksum
    ) {
      return;
    }

    $resourceAndChecksum.update(next as ResourceAndChecksum<TResource>);

    console.group(`Client Env (${client.clientId}) Store Updated:`);
    console.log('Prev State:', store.current.state, store.current.checksum);

    // store.current = {
    //   checksum: next.checksum,
    //   state: next.resource.item,
    // };

    console.log('Next State:', store.current.state, store.current.checksum);
    console.groupEnd();
    console.log();
  });

  return {
    ...client,
    getCurrent() {
      console.debug(
        'client get',
        client.clientId,
        store.current.state,
        store.current.checksum
      );
      return store.current;
    },
    getState() {
      return this.getCurrent().state;
    },
    getChecksum() {
      return this.getCurrent().checksum;
    },
    dispatch: createDispatcher<TResource, ActionsCollectionMap>(
      $resourceAndChecksum,
      // delay(NETWORK_LAG_MS).then(() => getResourceObj(client.clientId).resource),
      reducerMap,
      {
        onDispatched: async (next, prev, localAction, remoteAction) => {
          // console.debug(
          //   'HERE!!! on dispatched for client',
          //   client.clientId,
          //   localAction.type,
          //   next.state,
          //   next.checksum
          // );
          // On updated
          // if (next.checksum !== prev.checksum) {
          //   store.current = next;
          // }
          // Save the client right away
          // actualWhiteClientState = next.state;
          // actualWhiteClientChecksum = next.checksum;

          // This simulates what happen in client-sdk

          // Simulate network lag
          await delay(NETWORK_LAG_MS);

          client.emitActionToMaster(localAction);

          if (remoteAction) {
            client.emitActionToMaster(remoteAction);
          }

          onDispatched(store.current, prev);

          // const [localActionAck, remoteActionAck] = await masterReducer(
          //   localAction,
          //   remoteAction
          // ).resolveUnwrap();

          // const [nextPrivateState, nextPrivateChecksum] = localActionAck;

          // if (remoteActionAck) {
          //   const [nextPublicState, nextPublicChecksum] = remoteActionAck;
          // }

          // const [] = localAck;
          // Simulate the backend
          // const [privateServerState, privateServerChecksum] =
          //   await applyReducerAction<GameActionsMap, GameResource>(
          //     gameResource,
          //     reducerMap
          //   )(localAction).resolveUnwrapOr([]);

          // privateServerActual = privateServerState;
          // privateServerActualChecksum = privateServerChecksum;

          // // This is only present if the local action was private
          // if (remoteAction) {
          //   const [publicServerState, publicServerChecksum] =
          //     await applyReducerAction<GameActionsMap, GameResource>(
          //       gameResource,
          //       reducerMap
          //     )(remoteAction).resolveUnwrapOr([]);

          //   publicServerActual = publicServerState;
          //   publicServerActualChecksum = publicServerChecksum;
          // }
        },
      }
    ),
  };
};
