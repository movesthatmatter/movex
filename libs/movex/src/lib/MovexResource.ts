import type {
  ResourceIdentifier,
  ResourceIdentifierStr,
  UnsubscribeFn,
  AnyAction,
  CheckedReconciliatoryActions,
  MovexReducer,
  IOConnection,
} from 'movex-core-util';
import {
  globalLogsy,
  toResourceIdentifierObj,
  toResourceIdentifierStr,
  invoke,
} from 'movex-core-util';
import { ConnectionToMasterResource } from './ConnectionToMasterResource';
import { MovexResourceObservable } from './MovexResourceObservable';
import * as deepObject from 'deep-object-diff';

const logsy = globalLogsy.withNamespace('[Movex][MovexResource]');

export class MovexResource<
  S,
  A extends AnyAction,
  TResourceType extends string
> {
  private connectionToMasterResource: ConnectionToMasterResource<
    S,
    A,
    TResourceType
  >;

  private unsubscribersByRid: Record<
    ResourceIdentifierStr<string>,
    UnsubscribeFn[]
  > = {};

  constructor(
    private connectionToMaster: IOConnection<S, A, TResourceType>,
    private resourceType: TResourceType,
    private reducer: MovexReducer<S, A>
  ) {
    this.connectionToMasterResource = new ConnectionToMasterResource(
      resourceType,
      this.connectionToMaster
    );
  }

  create(state: S, resourceId?: string) {
    return this.connectionToMasterResource
      .create(this.resourceType, state, resourceId)
      .map((item) => ({
        ...item,
        rid: toResourceIdentifierObj<TResourceType>(item.rid),
        state: item.state[0],
      }));
  }

  get(rid: ResourceIdentifier<TResourceType>) {
    return this.connectionToMasterResource.getResource(rid);
  }

  /**
   * Connect the Master to the Client resource
   *
   * @param rid
   * @returns MovexResourceObservable
   */
  bind(rid: ResourceIdentifier<TResourceType>) {
    // TODO:
    // What if this is used multiple times for the sameclient?
    // It should actually store it in the instance so it can be reused rather than created again, I suggest!
    // This also willl allow the get to craete the observable and sync it

    const resourceObservable = new MovexResourceObservable(
      this.connectionToMaster.clientId,
      rid,
      this.reducer
    );

    // resourceObservable.$subscribers.get()

    // TODO: Fix this!!!
    // resourceObservable.setMasterSyncing(false);

    const syncLocalState = () => {
      return this.connectionToMasterResource
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

      const prevCheckedState = resourceObservable.state;

      return syncLocalState().map((masterCheckState) => {
        logsy.warn('State Resynch-ed', {
          prevCheckedState,
          masterCheckState,
          diff: deepObject.detailedDiff(prevCheckedState, masterCheckState),
        });
        console.warn(
          "This shouldn't happen too often! If it does, make sure there's no way around it! See this for more https://github.com/movesthatmatter/movex/issues/8"
        );

        return masterCheckState;
      });
    };

    this.connectionToMasterResource
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
      p: CheckedReconciliatoryActions<A>
    ) => {
      const prevState = resourceObservable.getCheckedState();
      const nextState = resourceObservable.applyMultipleActions(
        p.actions
      ).checkedState;

      logsy.log('Reconciliatory Actions Received', {
        ...p,
        actionsCount: p.actions.length,
        clientId: this.connectionToMaster.clientId,
        nextState,
        prevState,
      });

      if (nextState[1] !== p.finalChecksum) {
        // If the checksums are different then it this case it's needed to resync.
        // See this https://github.com/movesthatmatter/movex/issues/8
        resyncLocalState();

        // Here is where this happens!!!

        logsy.warn('Local and Final Master Checksum Mismatch', {
          ...p,
          nextState: nextState[1],
        });
      }

      logsy.groupEnd();

      // p.actions.map(())
      // TODO: What should the reconciliatry actions do? Apply them all together and check at the end right?
      // If the end result don't match the checkusm this is the place where it can reask the master for the new state!
      // This is where that amazing logic lives :D
    };

    this.unsubscribersByRid[toResourceIdentifierStr(rid)] = [
      resourceObservable.onDispatched(
        ({ action, next: nextLocalCheckedState }) => {
          const [nextLocalState, nextLocalChecksum] = nextLocalCheckedState;

          this.connectionToMasterResource
            .emitAction(rid, action)
            .map(async (master) => {
              if (master.reconciled) {
                onReconciliateActionsHandler(master);

                return;
              }

              // Otherwise if it's a simple ack

              // And the checksums are equal stop here
              if (master.nextChecksum === nextLocalChecksum) {
                return;
              }

              // When the checksums are not the same, need to resync the state!
              // this is expensive and ideally doesn't happen too much.

              logsy.error(`Dispatch Ack Error: "Checksums MISMATCH"`, {
                action,
                clientId: this.connectionToMaster.clientId,
              });

              await resyncLocalState()
                .map((masterState) => {
                  logsy.info('Resynched Result', {
                    masterState,
                    nextLocalCheckedState,
                    diff: deepObject.detailedDiff(
                      masterState,
                      nextLocalCheckedState
                    ),
                  });
                })
                .resolve();
            });
        }
      ),
      this.connectionToMasterResource.onFwdAction(rid, (p) => {
        const prevState = resourceObservable.getCheckedState();

        resourceObservable.reconciliateAction(p);

        const nextState = resourceObservable.getCheckedState();

        logsy.info('Forwarded Action Received', {
          ...p,
          clientId: this.connectionToMaster.clientId,
          prevState,
          nextState,
        });
      }),
      this.connectionToMasterResource.onReconciliatoryActions(
        rid,
        onReconciliateActionsHandler
      ),

      // Subscribers
      this.connectionToMasterResource.onSubscriberAdded(rid, (clientId) => {
        logsy.info('Subscriber Added', { clientId });

        resourceObservable.updateSubscribers((prev) => ({
          ...prev,
          [clientId]: null,
        }));
      }),
      this.connectionToMasterResource.onSubscriberRemoved(rid, (clientId) => {
        logsy.info('Subscriber Removed', { clientId });

        resourceObservable.updateSubscribers((prev) => {
          const { [clientId]: removed, ...rest } = prev;

          return rest;
        });
      }),

      // Destroyers

      // Add the client resource destroy to the list of unsubscribers
      () => resourceObservable.destroy(),

      // Add the master Resource Destroy as well
      () => this.connectionToMasterResource.destroy(),

      // Logger
      resourceObservable.onDispatched(
        ({
          action,
          next: nextLocalCheckedState,
          prev: prevLocalCheckedState,
        }) => {
          logsy.info('Action Dispatched', {
            action,
            clientId: this.connectionToMaster.clientId,
            prevState: prevLocalCheckedState,
            nextLocalState: nextLocalCheckedState,
          });
        }
      ),
    ];

    return resourceObservable;
  }

  // Call to unsubscribe
  unbind(rid: ResourceIdentifier<TResourceType>) {
    (this.unsubscribersByRid[toResourceIdentifierStr(rid)] || []).forEach(
      invoke
    );
  }
}
