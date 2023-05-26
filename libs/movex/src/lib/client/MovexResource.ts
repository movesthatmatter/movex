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
  AnyAction,
  GetReducerAction,
  MovexReducer,
} from '../tools';
import { ConnectionToMasterResource } from './ConnectionToMasterResource';
import { MovexResourceObservable } from './MovexResourceObservable';
import { IOConnection } from '../io-connection/io-connection';
import { MovexBoundResource } from './MovexBoundResource';

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
        rid: item.rid,
        state: item.state[0],
        id: toResourceIdentifierObj(item.rid).resourceId,
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
      this.reducer
    );

    // Done/TODO: Needs a way to add a resource subscriber
    this.connectionToMasterResource.addResourceSubscriber(rid).map(() => {
      // TODO: This could be optimized to be returned from the "addResourceSubscriber" directly
      this.connectionToMasterResource.get(rid).map((s) => {
        resourceObservable.sync(s);
      });
    });

    this.unsubscribersByRid[toResourceIdentifierStr(rid)] = [
      resourceObservable.onDispatched(({ action, next: nextCheckedState }) => {
        const [, nextChecksum] = nextCheckedState;

        this.connectionToMasterResource
          .emitAction(rid, action)
          .map(async (masterChecksum) => {
            if (masterChecksum === nextChecksum) {
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

            // Should get the next master state
            const masterState = await this.connectionToMasterResource
              .get(rid)
              .resolveUnwrap();

            console.log('Master State:', JSON.stringify(masterState, null, 2));
            console.log(
              'Local State:',
              JSON.stringify(nextCheckedState, null, 2)
            );
            console.groupEnd();
          });
      }),
      this.connectionToMasterResource.onFwdAction(rid, (p) => {
        resourceObservable.reconciliateAction(p);
      }),
      this.connectionToMasterResource.onReconciliatoryActions(rid, (p) => {
        p.actions.forEach((action) => {
          resourceObservable.applyAction(
            action as ActionOrActionTupleFromAction<
              GetReducerAction<typeof this.reducer>
            >
          );
          // clientResource.reconciliateAction
        });

        // p.actions.map(())
        // TODO: What should the reconciliatry actions do? Apply them all together and check at the end right?
        // If the end result don't match the checkusm this is the place where it can reask the master for the new state!
        // This is where that amazing logic lives :D
      }),
      // Add the client resource destroy to the list of unsubscribers
      () => resourceObservable.destroy(),

      // Add the master Resource Destroy as well
      () => this.connectionToMasterResource.destroy(),
    ];

    return new MovexBoundResource(resourceObservable);
  }

  // Call to unsubscribe
  unbind(rid: ResourceIdentifier<TResourceType>) {
    (this.unsubscribersByRid[toResourceIdentifierStr(rid)] || []).forEach(
      invoke
    );
  }
}
