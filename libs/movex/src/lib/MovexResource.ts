import type {
  AnyAction,
  IOEvents,
  UnsubscribeFn,
  ResourceIdentifier,
  ResourceIdentifierStr,
  MovexReducer,
  MovexMasterContext,
} from 'movex-core-util';
import {
  globalLogsy,
  toResourceIdentifierObj,
  toResourceIdentifierStr,
  invoke,
} from 'movex-core-util';
import { ConnectionToMasterResources } from './ConnectionToMasterResources';
import { MovexResourceObservable } from './MovexResourceObservable';
import { type ConnectionToMaster } from './ConnectionToMaster';
import { Err, Ok } from 'ts-results';

const logsy = globalLogsy.withNamespace('[MovexResource]');

const ChecksumMismatchError = 'ChecksumMismatch';

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

    // TODO: Fix this!!!
    // resourceObservable.setMasterSyncing(false);

    const syncLocalState = () =>
      this.connectionToMasterResources.getState(rid).map((masterCheckState) => {
        resourceObservable.syncState(masterCheckState);

        return masterCheckState;
      });

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

      return syncLocalState().map((masterCheckedState) => {
        // https://shorturl.at/hfKTI = https://github.com/movesthatmatter/movex/issues/8
        logsy.warn('State Resynch-ed (See https://shorturl.at/hfKTI)', {
          local: prevCheckedState,
          master: masterCheckedState,
          // TODO: Do we really need this?
          // diff: deepObject.detailedDiff(prevCheckedState, masterCheckState),
        });

        return masterCheckedState;
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
        ({ action, next: nextLocalCheckedState, reapplyActionToPrevState }) => {
          this.connectionToMasterResources
            .emitAction(rid, action)
            .map((response) => {
              const localizedMasterContext: MovexMasterContext = {
                requestAt: response.masterContext.requestAt,
              };

              if (response.type === 'reconciliation') {
                // TODO: Aug28.2024 Add the onMasterContextReceived here as well
                onReconciliateActionsHandler({
                  ...response,
                  rid,
                  masterContext: localizedMasterContext,
                });

                // TODO: Does this need to do something more here?
                return Ok.EMPTY;
              }

              const result = invoke(() => {
                if (response.type === 'masterActionAck') {
                  const reapplied = reapplyActionToPrevState(
                    response.nextCheckedAction.action
                  );

                  const nextLocalState =
                    resourceObservable.applyStateTransformerToCheckedStateAndUpdate(
                      reapplied,
                      localizedMasterContext
                    );

                  if (
                    nextLocalState[1] !== response.nextCheckedAction.checksum
                  ) {
                    return new Err(ChecksumMismatchError);
                  }

                  return Ok.EMPTY;
                }

                // Regular Ack Response
                const localCheckedState =
                  resourceObservable.applyStateTransformer(
                    localizedMasterContext
                  );

                if (localCheckedState[1] !== response.nextChecksum) {
                  return new Err(ChecksumMismatchError);
                }

                return Ok.EMPTY;
              });

              if (result.err && ChecksumMismatchError) {
                logsy.warn(`Dispatch Ack ChecksumsMismatchError`, {
                  clientId: this.connectionToMaster.client.id,
                  rid,
                  action,
                  nextLocalCheckedState,
                  response,
                });

                // When the checksums aren't the same, need to resync the state!
                // this is expensive and ideally doesn't happen too much.
                resyncLocalState();
              }

              return Ok.EMPTY;
            });
        }
      ),
      this.connectionToMasterResources.onFwdAction(rid, (p) => {
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
      resourceObservable.onDispatched((payload) => {
        logsy.info('Action Dispatched', {
          ...payload,
          clientId: this.connectionToMaster.client.id,
        });
      }),
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

  // Call to unsubscribe
  unbind(rid: ResourceIdentifier<TResourceType>) {
    (this.unsubscribersByRid[toResourceIdentifierStr(rid)] || []).forEach(
      invoke
    );
  }
}
