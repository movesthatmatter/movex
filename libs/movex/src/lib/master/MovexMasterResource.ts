import {
  NextStateGetter,
  GenericResourceType,
  ResourceIdentifier,
  MovexClient,
  objectKeys,
  toResourceIdentifierStr,
} from 'movex-core-util';
import { AsyncOk, AsyncResult } from 'ts-async-results';
import { CheckedState } from '../core-types';
import { MovexStatePatch, MovexStore, MovexStoreItem } from '../movex-store';
import {
  ActionOrActionTupleFromAction,
  AnyAction,
  isAction,
  ToCheckedAction,
  CheckedReconciliatoryActions,
} from '../tools/action';
import { MovexReducer } from '../tools/reducer';
import {
  applyMovexStatePatches,
  computeCheckedState,
  getMovexStatePatch,
  getUuid,
} from '../util';

/**
 * This Class works with a Resource Type (not Resource Identifier),
 * and thus is able to handle all resources of type at the same time,
 * b/c it runs on the backend (most likely, but it could also be run on the client)
 */
export class MovexMasterResource<
  TState extends any,
  TAction extends AnyAction = AnyAction
> {
  constructor(
    private reducer: MovexReducer<TState, TAction>,
    private store: MovexStore<TState>
  ) {}

  private computeClientState(
    clientId: MovexClient['id'],
    item: MovexStoreItem<TState>
  ) {
    const patches = item.patches?.[clientId];
    if (patches) {
      return this.reconcileState(item.state[0], patches);
    }

    return item.state;
  }

  create<TResourceType extends GenericResourceType>(
    resourceType: TResourceType,
    state: TState
  ) {
    return (this.store as MovexStore<TState, TResourceType>).create(
      toResourceIdentifierStr({
        resourceType,
        resourceId: getUuid(), // should this be defined here? Probably but it could also be given from outside
      }),
      state
    );
  }

  private reconcileState(state: TState, patches: MovexStatePatch<TState>[]) {
    // TODO: left it here!
    // TODO: This needs some more thinking as some use cases don't work - like what if the public state has updated
    // since the private diffs were created – how are they applied then? B/c the resulting might not work exactly
    // There are different types of diff and I don't now what the consequences are for each – I don't see the whole picture,
    //  in whih case I am "overwhelmed" at thinking of a solution w/o knowing them.
    // In case the state has changed – I could run the patch on the Public 0 => resulting Public 0.5, then a patch at Public 1 over Public 0.5
    //  if there are different (if the checksums don't match). In which case I could do something for each scenario
    //    I guess the Public 1 overwrites the Public 0.5 in everything except for the paths it changed (the diff)
    // return privateDiffs.reduce(() => {}, store.public)

    const reconciledState = applyMovexStatePatches(
      state,
      patches.map((p) => p.patch)
    );

    // Should the checksum compute happen each time or should it be stored?
    return computeCheckedState(reconciledState);
  }

  getItem<TResourceType extends GenericResourceType>(
    rid: ResourceIdentifier<TResourceType>
  ) {
    return this.store.get(rid);
  }

  getSubscribers<TResourceType extends GenericResourceType>(
    rid: ResourceIdentifier<TResourceType>
  ) {
    return this.store.get(rid).map((r) => r.subscribers);
  }

  getPublicState<TResourceType extends GenericResourceType>(
    rid: ResourceIdentifier<TResourceType>
  ) {
    // TODO: Here probably should include the id!
    //   at this level or at the store level?
    // Sometime the state could have it's own id but not always and it should be given or not? :/
    return this.store.get(rid).map((r) => r.state);
  }

  /**
   * This gets the public state or the client private state if
   *  there are any private state for the given clientId
   *
   * @param rid
   * @param clientId
   * @returns
   */
  getState<TResourceType extends GenericResourceType>(
    rid: ResourceIdentifier<TResourceType>,
    clientId: MovexClient['id']
  ) {
    return this.store
      .get(rid, clientId)
      .map((item) => this.computeClientState(clientId, item));
  }

  getStateByClientId<TResourceType extends GenericResourceType>(
    rid: ResourceIdentifier<TResourceType>
  ) {
    return this.getItem(rid).map((item) => {
      return objectKeys(item.subscribers).reduce((prev, nextClientId) => {
        return {
          ...prev,
          [nextClientId]: this.computeClientState(nextClientId, item),
        };
      }, {} as Record<MovexClient['id'], CheckedState<TState>>);
    });
  }

  // This action gets applied both on the public and the private state
  // applyAction<TResourceType extends GenericResourceType>(
  //   rid: ResourceIdentifier<TResourceType>,
  //   clientId: MovexClient['id'],
  //   publicAction: ToPublicAction<TAction>
  // ): AsyncResult<MovexStoreItem<TState>, unknown>;
  // applyAction<TResourceType extends GenericResourceType>(
  //   rid: ResourceIdentifier<TResourceType>,
  //   clientId: MovexClient['id'],
  //   actionTuple: ActionTupleFrom<TAction>
  // ): AsyncResult<
  //   [privateState: MovexStoreItem<TState>, publicState: MovexStoreItem<TState>],
  //   unknown
  // >;
  // applyAction<TResourceType extends GenericResourceType>(
  //   rid: ResourceIdentifier<TResourceType>,
  //   clientId: MovexClient['id'],
  //   actionOrActionTuple: ActionOrActionTupleFromAction<TAction>
  // ): AsyncResult<
  //   | MovexStoreItem<TState>
  //   | [
  //       privateState: MovexStoreItem<TState>,
  //       publicState: MovexStoreItem<TState>
  //     ],
  //   unknown
  // >;

  applyAction<TResourceType extends GenericResourceType>(
    rid: ResourceIdentifier<TResourceType>,
    clientId: MovexClient['id'],
    actionOrActionTuple: ActionOrActionTupleFromAction<TAction>
  ) {
    console.log('Movex Master Resource', clientId, 'applyAction:', actionOrActionTuple);

    return this.getItem(rid).flatMap<
      {
        nextPublic: ToCheckedAction<TAction>;
        nextPrivate?: ToCheckedAction<TAction>;
        reconciliatoryActionsByClientId?: Record<
          MovexClient['id'],
          CheckedReconciliatoryActions<TAction>
        >;
      },
      unknown
    >((prevItem) => {
      const [prevState] = this.computeClientState(clientId, prevItem);

      if (isAction(actionOrActionTuple)) {
        const publicAction = actionOrActionTuple;
        return this.store
          .updateState(rid, this.reducer(prevState, publicAction))
          .map((nextPublicState) => ({
            nextPublic: {
              checksum: nextPublicState.state[1],
              action: publicAction,
            },
          }));
      }

      const [privateAction, publicAction] = actionOrActionTuple;

      const privatePatch = getMovexStatePatch(
        prevState,
        this.reducer(prevState, privateAction)
      );

      return (
        this.store
          // Apply the Private Action
          .addPrivatePatch(rid, clientId, {
            action: privateAction,
            patch: privatePatch,
          })
          // .map((item) => )
          .flatMap((itemWithLatestPatch) =>
            AsyncResult.all(
              new AsyncOk(itemWithLatestPatch),

              this.getState(rid, clientId),

              // Apply the Public Action
              // (*Note The Public Action needs to get applied after the private one!)
              // Why? TODO: Add reason
              this.store
                .updateState(rid, this.reducer(prevState, publicAction))
                .map((s) => s.state)
            )
          )
          // Reconciliation Step
          .flatMap(([nextItem, nextPrivateState, nextPublicState]) => {
            if (this.reducer.$canReconcileState?.(nextPublicState[0])) {
              const prevPatchesByClientId = nextItem.patches || {};

              const allPatches = Object.values(prevPatchesByClientId).reduce(
                (prev, next) => [...prev, ...next],
                [] as MovexStatePatch<TState>[]
              );

              return this.store
                .update(rid, {
                  state: this.reconcileState(nextPublicState[0], allPatches),
                  // Clear the patches from the Item
                  patches: undefined,
                })
                .map((nextReconciledPublicState) => {
                  const checkedReconciliatoryActionsByClientId = objectKeys(
                    prevPatchesByClientId
                  ).reduce((accum, nextClientId) => {
                    return {
                      ...accum,
                      [nextClientId]: {
                        actions: prevPatchesByClientId[nextClientId].map(
                          (p) => p.action as TAction
                        ),
                        finalChecksum: nextReconciledPublicState.state[1],
                      },
                    };
                  }, {} as Record<MovexClient['id'], CheckedReconciliatoryActions<TAction>>);

                  return [
                    nextReconciledPublicState.state,
                    nextReconciledPublicState.state,
                    checkedReconciliatoryActionsByClientId,
                  ] as const;
                });
            }

            return new AsyncOk([
              nextPrivateState,
              nextPublicState,
              {},
            ] as const);
          })
          .map(
            ([
              nextPrivateState,
              nextPublicState,
              reconciledFwdActionsByClientId,
            ]) =>
              ({
                nextPublic: {
                  checksum: nextPublicState[1],
                  action: publicAction,
                },
                nextPrivate: {
                  checksum: nextPrivateState[1],
                  action: privateAction,
                },
                reconciledFwdActionsByClientId:
                  Object.keys(reconciledFwdActionsByClientId).length > 0
                    ? reconciledFwdActionsByClientId
                    : undefined,
              } as const)
          )
      );
    });
  }

  // TODO: The ResourceType could be generic, or given in the Class Generic
  // getUncheckedState<TResourceType extends GenericResourceType>(
  //   rid: ResourceIdentifier<TResourceType>
  // ) {
  //   return this.store.get(rid).map((s) => s.state[0]);
  // }

  update<TResourceType extends GenericResourceType>(
    rid: ResourceIdentifier<TResourceType>,
    nextStateGetter: NextStateGetter<TState>
  ) {
    return this.store.updateState(rid, nextStateGetter);
  }

  // updateUncheckedState<TResourceType extends GenericResourceType>(
  //   rid: ResourceIdentifier<TResourceType>,
  //   nextStateGetter: NextStateGetter<TState>
  // ) {
  //   return this.update(
  //     rid,
  //     isFunction(nextStateGetter)
  //       ? (prev) => computeCheckedState(nextStateGetter(prev[0]))
  //       : computeCheckedState(nextStateGetter)
  //   );
  // }

  // This to be called when destroying not used anymore in order to clean the update subscriptions
  // destroy() {
  //   // this.unsubscribers.forEach(invoke);
  // }
}
