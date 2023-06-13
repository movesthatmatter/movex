import {
  ResourceIdentifier,
  ResourceIdentifierStr,
  UnsubscribeFn,
  invoke,
  toResourceIdentifierObj,
  toResourceIdentifierStr,
} from 'movex-core-util';
import {
  ActionOrActionTupleFromAction,
  ActionWithAnyPayload,
  AnyAction,
  CheckedReconciliatoryActions,
  GetReducerAction,
  MovexReducer,
  isAction,
} from '../tools';
import { ConnectionToMasterResource } from './ConnectionToMasterResource';
import { MovexResourceObservable } from './MovexResourceObservable';
import { IOConnection } from '../io-connection/io-connection';
import * as deepObject from 'deep-object-diff';

const logUnimportantStyle = 'color: grey;';
const logImportantStyle = 'font-weight: bold;';
const logIncomingStyle = 'color: #4CAF50; font-weight: bold;';
const logOutgoingStyle = 'color: #1EA7FD; font-weight: bold;';
const logOpenConnectionStyle = 'color: #EF5FA0; font-weight: bold';
const logClosedConnectionStyle = 'color: #DF9D04; font-weight: bold';
const logErrorStyle = 'color: red; font-weight: bold;';

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

  create(state: S) {
    return this.connectionToMasterResource
      .create(this.resourceType, state)
      .map((item) => ({
        rid: toResourceIdentifierObj(item.rid),
        state: item.state[0],
        // id: toResourceIdentifierObj(item.rid).resourceId,
      }));
  }

  get(rid: ResourceIdentifier<TResourceType>) {
    return this.connectionToMasterResource.get(rid).map(([state]) => state);

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

    // console.log(
    //   '[Movex] bind() connectionToMasterResource',
    //   this.connectionToMasterResource
    // );

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
        console.group('State Resynch-ed Warning');
        console.log(
          '%cPrev (Local) State',
          logUnimportantStyle,
          prevCheckedState
        );
        console.log(
          '%cNext (Master) Staet',
          logIncomingStyle,
          masterCheckState
        );
        console.debug(
          'Diff',
          deepObject.detailedDiff(prevCheckedState, masterCheckState)
        );
        console.warn(
          "This shouldn't happen too often! If it does, make sure there's no way around it! See this for more https://github.com/movesthatmatter/movex/issues/8"
        );
        console.groupEnd();

        return masterCheckState;
      });
    };

    // Done/TODO: Needs a way to add a resource subscriber
    this.connectionToMasterResource.addResourceSubscriber(rid).map(() => {
      // TODO: This is where the issue is. the master never responds

      // TODO: This could be optimized to be returned from the "addResourceSubscriber" directly
      syncLocalState();
    }).mapErr((e) => {
      console.error('[Movex] Add Resource Subscriber Error', e);
    });

    const onReconciliateActionsHandler = (
      p: CheckedReconciliatoryActions<A>
    ) => {
      const prevState = resourceObservable.get();

      console.group(
        `%c\u{25BC} %cReconciliatory Actions Received (${p.actions.length}). FinalCheckum ${p.finalChecksum}`,
        logIncomingStyle,
        logUnimportantStyle,
        'Client:',
        this.connectionToMaster.clientId
      );
      console.log('%cPrev state', logUnimportantStyle, prevState[0]);

      const nextState = resourceObservable.applyMultipleActions(p.actions);

      p.actions.forEach((action, i) => {
        console.log(
          `%cAction(${i + 1}/${p.actions.length}): %c${action.type}`,
          logOutgoingStyle,
          logImportantStyle,
          (action as ActionWithAnyPayload<string>).payload,
          action
        );
      });

      console.log('%cNextState', logIncomingStyle, nextState[0]);
      console.log(
        '%cchecksums',
        logUnimportantStyle,
        prevState[1],
        '>',
        nextState[1]
      );

      if (nextState[1] === p.finalChecksum) {
        console.log(
          '%cFinal Checksum Matches',
          logUnimportantStyle,
          p.finalChecksum
        );
      } else {
        // If the checksums are different then it this case it's needed to resync.
        // See this https://github.com/movesthatmatter/movex/issues/8
        resyncLocalState();

        // Here is where this happens!!!

        // console.log('Final Master State', p.finalState);
        console.warn(
          '%cLocal and Final Master Checksum Mismatch',
          logErrorStyle,
          nextState[1],
          p.finalChecksum
        );
      }

      console.groupEnd();

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

          console.group(
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
          console.log(
            '%cPrev state',
            logUnimportantStyle,
            prevLocalCheckedState[0]
          );
          if (isAction(action)) {
            console.log(
              `%cPublic Action: %c${action.type}`,
              logOutgoingStyle,
              logImportantStyle,
              (action as ActionWithAnyPayload<string>).payload
            );
          } else {
            const [privateAction, publicAction] = action;
            console.log(
              `%cPrivate action: %c${privateAction.type}`,
              logOpenConnectionStyle,
              logImportantStyle,
              (privateAction as ActionWithAnyPayload<string>).payload
            );
            console.log(
              `%cPublic action payload: %c${publicAction.type}`,
              logOutgoingStyle,
              logImportantStyle,
              (publicAction as ActionWithAnyPayload<string>).payload
            );
          }
          console.log('%cNext State', logIncomingStyle, nextLocalState);

          if (prevLocalCheckedState[1] !== nextLocalChecksum) {
            console.log(
              '%cChecksums',
              logUnimportantStyle,
              prevLocalCheckedState[1],
              '>',
              nextLocalChecksum
            );
          } else {
            console.log(
              '%cNo Diff',
              logUnimportantStyle,
              prevLocalCheckedState[1]
            );
          }

          console.groupEnd();

          this.connectionToMasterResource
            .emitAction(rid, action)
            .map(async (master) => {
              if (master.reconciled) {
                onReconciliateActionsHandler(master);

                return;
              }

              // Otherwise if it's a simple ack
              if (master.nextChecksum === nextLocalChecksum) {
                return;
              }

              // TODO: Here I need to check that the checksums are the same
              // If not the action needs to revert, or toask the connection to give me the next state

              // But when the action is reconciliatory (meaning the last one before reconiliang the state this happens, b/c it waits for the reconciliatory actions)
              // In that case this could return that I guess, or just leave it for now

              console.group(
                `[Movex] Dispatch Ack Error: "Checksums MISMATCH"\n`,
                `client: '${this.connectionToMaster.clientId}',\n`,
                'action:',
                action
              );

              await resyncLocalState()
                .map((masterState) => {
                  console.log(
                    'Master State:',
                    JSON.stringify(masterState[0], null, 2),
                    masterState[1]
                  );
                  console.log(
                    'Local State:',
                    JSON.stringify(nextLocalCheckedState[0], null, 2),
                    nextLocalCheckedState[1]
                  );
                  console.log(
                    'Diff',
                    deepObject.detailedDiff(masterState, nextLocalCheckedState)
                  );
                })
                .resolve();

              console.groupEnd();
            });
        }
      ),
      this.connectionToMasterResource.onFwdAction(rid, (p) => {
        const prevState = resourceObservable.get();

        resourceObservable.reconciliateAction(p);

        const nextState = resourceObservable.get();

        console.group(
          `%c\u{25BC} %cForwarded Action Received: %c${p.action.type}`,
          logIncomingStyle,
          logUnimportantStyle,
          logImportantStyle,
          'Client:',
          this.connectionToMaster.clientId
        );
        console.log('%cPrev state', logUnimportantStyle, prevState[0]);
        console.log(
          `%cAction: %c${p.action.type}`,
          logOutgoingStyle,
          logImportantStyle,
          (p.action as ActionWithAnyPayload<string>).payload
        );
        console.log('%cNextState', logIncomingStyle, nextState[0]);
        if (prevState[1] !== nextState[1]) {
          console.log(
            '%cchecksums',
            logUnimportantStyle,
            prevState[1],
            '>',
            nextState[1]
          );
        } else {
          console.log('%cNo Diff', logErrorStyle, prevState[1]);
        }

        console.groupEnd();
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
