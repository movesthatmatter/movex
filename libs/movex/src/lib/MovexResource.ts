import {
  ResourceIdentifier,
  ResourceIdentifierStr,
  UnsubscribeFn,
  AnyAction,
  CheckedReconciliatoryActions,
  MovexReducer,
  CheckedState,
  MovexMasterContext,
  computeCheckedState,
  IOEvents,
} from 'movex-core-util';
import {
  globalLogsy,
  toResourceIdentifierObj,
  toResourceIdentifierStr,
  invoke,
} from 'movex-core-util';
import { ConnectionToMasterResources } from './ConnectionToMasterResources';
import { MovexResourceObservable } from './MovexResourceObservable';
import * as deepObject from 'deep-object-diff';
import { ConnectionToMaster } from './ConnectionToMaster';

const logsy = globalLogsy.withNamespace('[Movex][MovexResource]');

export class MovexResource<
  S,
  A extends AnyAction,
  TResourceType extends string
> {
  private connectionToMasterResources: ConnectionToMasterResources<
    S,
    A,
    TResourceType
  >;

  private unsubscribersByRid: Record<
    ResourceIdentifierStr<string>,
    UnsubscribeFn[]
  > = {};

  constructor(
    private connectionToMaster: ConnectionToMaster<S, A, TResourceType, any>,
    private resourceType: TResourceType,
    private reducer: MovexReducer<S, A>
  ) {
    this.connectionToMasterResources = new ConnectionToMasterResources(
      resourceType,
      this.connectionToMaster
    );
  }

  create(state: S, resourceId?: string) {
    return this.connectionToMasterResources
      .create(this.resourceType, state, resourceId)
      .map((item) => ({
        ...item,
        rid: toResourceIdentifierObj<TResourceType>(item.rid),
        state: item.state[0],
      }));
  }

  get(rid: ResourceIdentifier<TResourceType>) {
    return this.connectionToMasterResources.getResource(rid).map((item) => ({
      ...item,
      rid: toResourceIdentifierObj<TResourceType>(item.rid),
      state: item.state[0],
    }));
  }

  /**
   * Connect the Master to the Client resource
   *
   * @param rid
   * @returns MovexResourceObservable
   */
  // TOOD: Should bind() expose the whole MovexResourceObservable to the consumer or only a filtered one
  bind(rid: ResourceIdentifier<TResourceType>): MovexResourceObservable<S, A> {
    // TODO:
    // What if this is used multiple times for the sameclient?
    // It should actually store it in the instance so it can be reused rather than created again, I suggest!
    // This also willl allow the get to craete the observable and sync it

    const resourceObservable = new MovexResourceObservable(
      this.connectionToMaster.client.id,
      rid,
      this.reducer
    );

    // resourceObservable.$subscribers.get()

    // TODO: Fix this!!!
    // resourceObservable.setMasterSyncing(false);

    const syncLocalState = () => {
      return this.connectionToMasterResources
        .getState(rid)
        .map((masterCheckState) => {
          resourceObservable.syncState(masterCheckState);

          return masterCheckState;
        });
    };

    /**
     * This resyncs the local & master states
     *
     * Note: This is an expensive call, since it asks for the whole state from the master (server),
     * only use in situations when it's really really needed!
     *
     * @returns
     */
    const resyncLocalState = () => {
      // This is needed in order for all the dipatches in an unsynched state get postponed until sync is back
      resourceObservable.setUnsync();

      const prevCheckedState = resourceObservable.get().checkedState;

      return syncLocalState().map((masterCheckState) => {
        logsy.warn('State Resynch-ed', {
          prevCheckedState,
          masterCheckState,
          diff: deepObject.detailedDiff(prevCheckedState, masterCheckState),
        });
        logsy.debug(
          "This shouldn't happen too often! If it does, make sure there's no way around it! See this for more https://github.com/movesthatmatter/movex/issues/8"
        );

        return masterCheckState;
      });
    };

    this.connectionToMasterResources
      .addResourceSubscriber(rid)
      .map((res) => {
        // TODO: This could be optimized to be returned from the "addResourceSubscriber" directly
        // syncLocalState();

        // Added on April 1st
        // TODO: This can be improved to update the whole resource or smtg like that, also to look at the sync and think should the subscribers also sync
        resourceObservable.syncState(res.state);
        resourceObservable.updateSubscribers(res.subscribers);
      })
      .mapErr((error) => {
        logsy.error('Add Resource Subscriber Error', { error });
      });

    const onReconciliateActionsHandler = (
      // p: CheckedReconciliatoryActions<A>
      p: Parameters<IOEvents<S, A, TResourceType>['onReconciliateActions']>[0]
    ) => {
      const prevState = resourceObservable.getCheckedState();

      resourceObservable.applyMultipleActions(p.actions);
      const nextState = resourceObservable.applyStateTransformer(
        p.masterContext
      );

      logsy.log('ReconciliatoryActions Received', {
        ...p,
        clientId: this.connectionToMaster.client.id,
        nextState,
        prevState,
      });

      if (nextState[1] !== p.finalChecksum) {
        // When the checksums are different then re-sync.
        // See https://github.com/movesthatmatter/movex/issues/8
        resyncLocalState();

        logsy.warn('ReconciliatoryActions Checksums Mismatch', {
          ...p,
          clientId: this.connectionToMaster.client.id,
          prevState,
          nextState,
        });
      }

      logsy.groupEnd();
    };

    this.unsubscribersByRid[toResourceIdentifierStr(rid)] = [
      resourceObservable.onDispatched(
        ({
          action,
          next: nextLocalCheckedState,
          masterAction,
          onEmitMasterActionAck,
          // onMasterContextReceived,
        }) => {
          this.connectionToMasterResources
            .emitAction(rid, masterAction || action)
            .map((response) => {
              const localizedMasterContext: MovexMasterContext = {
                ...response.masterContext,
                ...{ _local: true },

                // @deprecate this is not used anymore in favor of requestAt
                now: (): number => {
                  console.warn(
                    'LocalizedMasterCotext.now() is deprecated in favor of requestAt - start using that!'
                  );

                  // Defaulting to requestAt,
                  return response.masterContext.requestAt;
                  // return NaN;
                },
              };

              if (response.type === 'reconciliation') {
                // TODO: Aug28.2024 Add the onMasterContextReceived here as well
                onReconciliateActionsHandler({
                  ...response,
                  rid,
                  masterContext: localizedMasterContext,
                });

                return;
              }

              // console.log(
              //   '---onDispatch callback started',
              //   JSON.stringify(
              //     { action, clientId: this.connectionToMaster.client.id },
              //     null,
              //     2
              //   )
              // );
              const nextChecksums = invoke(() => {
                if (response.type === 'masterActionAck') {
                  onEmitMasterActionAck(response.nextCheckedAction);

                  const localCheckedState =
                    resourceObservable.applyStateTransformer(
                      localizedMasterContext
                    );

                  // console.log(
                  //   'localCheckedState',
                  //   `client:${this.connectionToMaster.client.id}`,
                  //   JSON.stringify(localCheckedState, null, 2)
                  // );

                  return {
                    local: localCheckedState[1],
                    master: response.nextCheckedAction.checksum,
                  };
                }

                const localCheckedState =
                  resourceObservable.applyStateTransformer(
                    localizedMasterContext
                  );

                // console.log(
                //   'localCheckedState',
                //   `client:${this.connectionToMaster.client.id}`,
                //   JSON.stringify(localCheckedState, null, 2)
                // );

                return {
                  local: localCheckedState[1],
                  master: response.nextChecksum,
                };
              });

              // console.log(
              //   'nextChecksums',
              //   JSON.stringify(nextChecksums, null, 2)
              // );

              // console.log('---onDispatch callback ended');

              // console.log('');
              // And the checksums are equal stop here
              if (nextChecksums.master === nextChecksums.local) {
                return;
              }

              // When the checksums aren't the same, need to resync the state!
              // this is expensive and ideally doesn't happen too much.

              logsy.error(`Dispatch Ack Error: "Checksums MISMATCH"`, {
                clientId: this.connectionToMaster.client.id,
                action,
                response,
                nextLocalCheckedState,
              });

              resyncLocalState();
            });
        }
      ),
      this.connectionToMasterResources.onFwdAction(rid, (p) => {
        // logsy.group('FwdAction Received', {
        logsy.group('FwdAction Received', {
          ...p,
          clientId: this.connectionToMaster.client.id,
        });

        const result = resourceObservable.reconciliateAction(
          p,
          p.masterContext
        );

        if (result.err) {
          logsy.warn('FwdAction Checksums Mismatch', {
            ...p,
            clientId: this.connectionToMaster.client.id,
            prevState: resourceObservable.getCheckedState(),
            error: result.val,
          });

          resyncLocalState();
        }

        logsy.groupEnd();
      }),
      this.connectionToMasterResources.onReconciliatoryActions(
        rid,
        onReconciliateActionsHandler
      ),

      // Subscribers
      this.connectionToMasterResources.onSubscriberAdded(rid, (client) => {
        resourceObservable.updateSubscribers((prev) => ({
          ...prev,
          [client.id]: client,
        }));

        logsy.info('Subscriber Added', { client });
      }),
      this.connectionToMasterResources.onSubscriberRemoved(rid, (clientId) => {
        resourceObservable.updateSubscribers((prev) => {
          const { [clientId]: removed, ...rest } = prev;

          return rest;
        });

        logsy.info('Subscriber Removed', { clientId });
      }),

      // Destroyers

      // Add the client resource destroy to the list of unsubscribers
      () => resourceObservable.destroy(),

      // Add the master Resource Destroy as well
      () => this.connectionToMasterResources.destroy(),

      // Logger
      resourceObservable.onDispatched(
        ({
          action,
          next: nextLocalCheckedState,
          prev: prevLocalCheckedState,
        }) => {
          logsy.info('Action Dispatched', {
            action,
            clientId: this.connectionToMaster.client.id,
            prevState: prevLocalCheckedState,
            nextLocalState: nextLocalCheckedState,
          });
        }
      ),
    ];

    // I like this idea of decorating the disaptch, and look at its return instead of subscribing to onDispatched
    // this way, if the dispatcher needs to wait for the master it can do that somehow easier
    // it needs to wait for master with the new $movexQueries like generateId or randomInt or stuff like that
    // const nextDispatch = (...args: Parameters<DispatchFn>) => {
    //   resourceObservable.dispatch(...args);
    // }

    // resourceObservable.dispatch()

    return resourceObservable;
  }

  // private applyStateTransformer(
  //   checkedState: CheckedState<S>,
  //   masterContext: MovexMasterContext
  // ): CheckedState<S> {
  //   if (typeof this.reducer.$transformState === 'function') {
  //     return computeCheckedState(
  //       this.reducer.$transformState(checkedState[0], masterContext)
  //     );
  //   }

  //   return checkedState;
  // }

  // Call to unsubscribe
  unbind(rid: ResourceIdentifier<TResourceType>) {
    (this.unsubscribersByRid[toResourceIdentifierStr(rid)] || []).forEach(
      invoke
    );
  }
}
