import type {
  ResourceIdentifier,
  ResourceIdentifierStr,
  UnsubscribeFn,
  ActionWithAnyPayload,
  AnyAction,
  CheckedReconciliatoryActions,
  MovexReducer,
  IOConnection,
} from 'movex-core-util';
import {
  logsy as rawLogsy,
  toResourceIdentifierObj,
  toResourceIdentifierStr,
  isAction,
  invoke,
} from 'movex-core-util';
import { ConnectionToMasterResource } from './ConnectionToMasterResource';
import { MovexResourceObservable } from './MovexResourceObservable';
import * as deepObject from 'deep-object-diff';

// TODO: Take away from here as it's adding to the size
const logUnimportantStyle = 'color: grey;';
const logImportantStyle = 'font-weight: bold;';
const logIncomingStyle = 'color: #4CAF50; font-weight: bold;';
const logOutgoingStyle = 'color: #1EA7FD; font-weight: bold;';
const logOpenConnectionStyle = 'color: #EF5FA0; font-weight: bold';
const logClosedConnectionStyle = 'color: #DF9D04; font-weight: bold';
const logErrorStyle = 'color: red; font-weight: bold;';

const logsy = rawLogsy.withNamespace('[MovexResource]');
// const logsy = rawLogsy;

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
        rid: toResourceIdentifierObj<TResourceType>(item.rid),
        state: item.state[0],
      }));
  }

  get(rid: ResourceIdentifier<TResourceType>) {
    return this.connectionToMasterResource.get(rid).map(([state]) => ({
      // This is rempaed in this way in order to return the same payload as "create"
      rid,
      state,
    }));

    // TODO: Once a client can bind multiple times this could also sync with the obsservable
    // .map((s) => {
    //   // TODO: This shoou
    //   // clientResource.sync(s);
    // });
  }

  /**
   * This returns the actual MovexClientResource. The name "use" doesn't seem to be perfect yet
   *  but not sure what to use yet. "observe", "listenTo", "attach", "follow" ?:)
   * I think "bind" works pretty well! :D
   *
   * @param rid
   * @returns
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

    // TODO: Fix this!!!
    // resourceObservable.setMasterSyncing(false);

    const syncLocalState = () => {
      return this.connectionToMasterResource
        .get(rid)
        .map((masterCheckState) => {
          resourceObservable.sync(masterCheckState);

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
        logsy.group('State Resynch-ed Warning');
        logsy.log(
          '%cPrev (Local) State',
          logUnimportantStyle,
          prevCheckedState
        );
        logsy.log('%cNext (Master) Staet', logIncomingStyle, masterCheckState);
        logsy.debug(
          'Diff',
          deepObject.detailedDiff(prevCheckedState, masterCheckState)
        );
        logsy.warn(
          "This shouldn't happen too often! If it does, make sure there's no way around it! See this for more https://github.com/movesthatmatter/movex/issues/8"
        );
        logsy.groupEnd();

        return masterCheckState;
      });
    };

    // Done/TODO: Needs a way to add a resource subscriber
    this.connectionToMasterResource
      .addResourceSubscriber(rid)
      .map(() => {
        // TODO: This is where the issue is. the master never responds

        // TODO: This could be optimized to be returned from the "addResourceSubscriber" directly
        syncLocalState();
      })
      .mapErr((e) => {
        logsy.error('Add Resource Subscriber Error', e);
      });

    const onReconciliateActionsHandler = (
      p: CheckedReconciliatoryActions<A>
    ) => {
      const prevState = resourceObservable.get();

      logsy.group(
        `%c\u{25BC} %cReconciliatory Actions Received (${p.actions.length}). FinalCheckum ${p.finalChecksum}`,
        logIncomingStyle,
        logUnimportantStyle,
        'Client:',
        this.connectionToMaster.clientId
      );
      logsy.log('%cPrev state', logUnimportantStyle, prevState[0]);

      const nextState = resourceObservable.applyMultipleActions(p.actions);

      p.actions.forEach((action, i) => {
        logsy.log(
          `%cAction(${i + 1}/${p.actions.length}): %c${action.type}`,
          logOutgoingStyle,
          logImportantStyle,
          (action as ActionWithAnyPayload<string>).payload,
          action
        );
      });

      logsy.log('%cNextState', logIncomingStyle, nextState[0]);
      logsy.log(
        '%cChecksums',
        logUnimportantStyle,
        prevState[1],
        '>',
        nextState[1]
      );

      if (nextState[1] === p.finalChecksum) {
        logsy.log(
          '%cFinal Checksum Matches',
          logUnimportantStyle,
          p.finalChecksum
        );
      } else {
        // If the checksums are different then it this case it's needed to resync.
        // See this https://github.com/movesthatmatter/movex/issues/8
        resyncLocalState();

        // Here is where this happens!!!

        logsy.warn(
          '%cLocal and Final Master Checksum Mismatch',
          logErrorStyle,
          nextState[1],
          p.finalChecksum
        );
      }

      logsy.groupEnd();

      // p.actions.map(())
      // TODO: What should the reconciliatry actions do? Apply them all together and check at the end right?
      // If the end result don't match the checkusm this is the place where it can reask the master for the new state!
      // This is where that amazing logic lives :D
    };

    this.unsubscribersByRid[toResourceIdentifierStr(rid)] = [
      resourceObservable.onDispatched(
        ({
          action,
          next: nextLocalCheckedState,
          prev: prevLocalCheckedState,
        }) => {
          const [nextLocalState, nextLocalChecksum] = nextLocalCheckedState;

          logsy.group(
            `%c\u{25B2} %cAction Dispatched: %c${
              isAction(action)
                ? action.type
                : action[0].type + ' + ' + action[1].type
            }`,
            logOutgoingStyle,
            logUnimportantStyle,
            logImportantStyle,
            'Client:',
            this.connectionToMaster.clientId
          );
          logsy.log(
            '%cPrev state',
            logUnimportantStyle,
            prevLocalCheckedState[0]
          );
          if (isAction(action)) {
            logsy.log(
              `%cPublic Action: %c${action.type}`,
              logOutgoingStyle,
              logImportantStyle,
              (action as ActionWithAnyPayload<string>).payload
            );
          } else {
            const [privateAction, publicAction] = action;
            logsy.log(
              `%cPrivate Action: %c${privateAction.type}`,
              logOpenConnectionStyle,
              logImportantStyle,
              (privateAction as ActionWithAnyPayload<string>).payload
            );
            logsy.log(
              `%cPublic Action payload: %c${publicAction.type}`,
              logOutgoingStyle,
              logImportantStyle,
              (publicAction as ActionWithAnyPayload<string>).payload
            );
          }
          logsy.log('%cNext State', logIncomingStyle, nextLocalState);

          if (prevLocalCheckedState[1] !== nextLocalChecksum) {
            logsy.log(
              '%cChecksums',
              logUnimportantStyle,
              prevLocalCheckedState[1],
              '>',
              nextLocalChecksum
            );
          } else {
            logsy.log(
              '%cNo Diff',
              logUnimportantStyle,
              prevLocalCheckedState[1]
            );
          }

          logsy.groupEnd();

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

              logsy.group(
                `[Movex] Dispatch Ack Error: "Checksums MISMATCH"\n`,
                `client: '${this.connectionToMaster.clientId}',\n`,
                'action:',
                action
              );

              await resyncLocalState()
                .map((masterState) => {
                  logsy.log(
                    'Master State:',
                    JSON.stringify(masterState[0], null, 2),
                    masterState[1]
                  );
                  logsy.log(
                    'Local State:',
                    JSON.stringify(nextLocalCheckedState[0], null, 2),
                    nextLocalCheckedState[1]
                  );
                  logsy.log(
                    'Diff',
                    deepObject.detailedDiff(masterState, nextLocalCheckedState)
                  );
                })
                .resolve();

              logsy.groupEnd();
            });
        }
      ),
      this.connectionToMasterResource.onFwdAction(rid, (p) => {
        const prevState = resourceObservable.get();

        resourceObservable.reconciliateAction(p);

        const nextState = resourceObservable.get();

        logsy.group(
          `%c\u{25BC} %cForwarded Action Received: %c${p.action.type}`,
          logIncomingStyle,
          logUnimportantStyle,
          logImportantStyle,
          'Client:',
          this.connectionToMaster.clientId
        );
        logsy.log('%cPrev State', logUnimportantStyle, prevState[0]);
        logsy.log(
          `%cAction: %c${p.action.type}`,
          logOutgoingStyle,
          logImportantStyle,
          (p.action as ActionWithAnyPayload<string>).payload
        );
        logsy.log('%cNext State', logIncomingStyle, nextState[0]);
        if (prevState[1] !== nextState[1]) {
          logsy.log(
            '%cchecksums',
            logUnimportantStyle,
            prevState[1],
            '>',
            nextState[1]
          );
        } else {
          logsy.log('%cNo Diff', logErrorStyle, prevState[1]);
        }

        logsy.groupEnd();
      }),
      this.connectionToMasterResource.onReconciliatoryActions(
        rid,
        onReconciliateActionsHandler
      ),
      // Add the client resource destroy to the list of unsubscribers
      () => resourceObservable.destroy(),

      // Add the master Resource Destroy as well
      () => this.connectionToMasterResource.destroy(),
    ];

    // return new MovexBoundResource(resourceObservable);
    return resourceObservable;
  }

  // Call to unsubscribe
  unbind(rid: ResourceIdentifier<TResourceType>) {
    (this.unsubscribersByRid[toResourceIdentifierStr(rid)] || []).forEach(
      invoke
    );
  }
}
