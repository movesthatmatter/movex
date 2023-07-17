import {
  NextStateGetter,
  GenericResourceType,
  ResourceIdentifier,
  MovexClient,
  objectKeys,
  toResourceIdentifierStr,
  getUuid,
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
  ToPublicAction,
} from '../tools/action';
import { MovexReducer } from '../tools/reducer';
import {
  applyMovexStatePatches,
  computeCheckedState,
  getMovexStatePatch,
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
    private store: MovexStore<Record<string, MovexReducer<TState, TAction>>>
  ) {}

  private computeClientState(
    clientId: MovexClient['id'],
    item: MovexStoreItem<TState>
  ) {
    const patches = item.patches?.[clientId];
    if (patches) {
      return computeCheckedState(
        this.mergeStatePatches(item.state[0], patches)
      );
    }

    return item.state;
  }

  create<TResourceType extends GenericResourceType>(
    resourceType: TResourceType,
    resourceState: TState,
    resourceId?: string
  ) {
    return this.store.create(
      toResourceIdentifierStr({
        resourceType,
        resourceId: resourceId || getUuid(),
      }),
      resourceState
    );
  }

  private mergeStatePatches(state: TState, patches: MovexStatePatch<TState>[]) {
    return applyMovexStatePatches(
      state,
      patches.map((p) => p.patch)
    );
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

  getStateBySubscriberId<TResourceType extends GenericResourceType>(
    rid: ResourceIdentifier<TResourceType>
  ) {
    return this.getItem(rid).map((item) =>
      this.computeStateForItemSubscribers(item)
    );
  }

  private computeStateForItemSubscribers<
    TResourceType extends GenericResourceType
  >(item: MovexStoreItem<TState, TResourceType>) {
    return objectKeys(item.subscribers).reduce(
      (prev, nextClientId) => ({
        ...prev,
        [nextClientId]: this.computeClientState(nextClientId, item),
      }),
      {} as Record<MovexClient['id'], CheckedState<TState>>
    );
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
    type ForwardablePeerActions = {
      type: 'forwardable';
      byClientId: Record<MovexClient['id'], ToCheckedAction<TAction>>;
    };

    type ReconcilablePeerActions = {
      type: 'reconcilable';
      byClientId: Record<
        MovexClient['id'],
        CheckedReconciliatoryActions<TAction>
      >;
    };

    type PeerActions = ForwardablePeerActions | ReconcilablePeerActions;

    return this.getItem(rid).flatMap<
      {
        nextPublic: ToCheckedAction<TAction>;
        nextPrivate?: ToCheckedAction<TAction>;
        peerActions: PeerActions;
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
            peerActions: {
              type: 'forwardable',
              byClientId: objectKeys(prevItem.subscribers).reduce(
                (prev, nextClientId) => {
                  // Exclude the sender
                  if (nextClientId === clientId) {
                    return prev;
                  }

                  return {
                    ...prev,
                    [nextClientId]: {
                      checksum: nextPublicState.state[1],
                      action: publicAction,
                    },
                  };
                },
                {} as ForwardablePeerActions['byClientId']
              ),
            },
          }));
      }

      const [privateAction, publicAction] = actionOrActionTuple;
      const nextPrivateState = this.reducer(prevState, privateAction);
      const privatePatch = getMovexStatePatch(prevState, nextPrivateState);

      return (
        this.store
          // Apply the Private Action
          .addPrivatePatch(rid, clientId, {
            action: privateAction,
            patch: privatePatch,
          })
          .flatMap((itemWithLatestPatch) =>
            AsyncResult.all(
              new AsyncOk(itemWithLatestPatch),

              this.getState(rid, clientId),

              // Apply the Public Action
              // *Note The Public Action needs to get applied after the private one!
              //  otherwise the resulted private patch will be based off of the next public state
              //  instead of the prev (private) one.
              this.store
                .updateState(rid, this.reducer(prevState, publicAction))
                .map((s) => s.state)
            )
          )
          .flatMap(([nextItem, nextPrivateState, nextPublicState]) =>
            AsyncResult.all(
              new AsyncOk(nextItem),
              new AsyncOk(nextPrivateState),
              new AsyncOk(nextPublicState),

              // Need to get this after the public state updates
              this.getStateBySubscriberId(rid)
            )
          )
          // Reconciliation Step
          .flatMap(
            ([
              nextItem,
              nextPrivateState,
              nextPublicState,
              stateBySubscribersId,
            ]) => {
              if (this.reducer.$canReconcileState?.(nextPublicState[0])) {
                const prevPatchesByClientId = nextItem.patches || {};

                const allPatches = Object.values(prevPatchesByClientId).reduce(
                  (prev, next) => [...prev, ...next],
                  [] as MovexStatePatch<TState>[]
                );

                // Merge all the private patches into the public state
                const mergedState = this.mergeStatePatches(
                  nextPublicState[0],
                  allPatches
                );

                // Run it once more through the reducer with the given private action
                // In order to calculate any derived state. If no state get calculated in
                //  this step, in theory it just returns the prev, but in some cases
                //  when a different field (such as "isWinner" or "status"), needs to get computed
                //  based on the fields modified by the private action is when it's needed!
                const reconciledState = this.reducer(
                  mergedState,
                  privateAction
                );

                return this.store
                  .update(rid, {
                    state: computeCheckedState(reconciledState),
                    // Clear the patches from the Item
                    patches: undefined,
                  })
                  .map((nextReconciledItemFromPublicState) => {
                    const checkedReconciliatoryActionsByClientId = objectKeys(
                      prevPatchesByClientId
                    ).reduce((accum, nextClientId) => {
                      const {
                        [nextClientId]: _,
                        ...peersPrevPatchesByClientId
                      } = prevPatchesByClientId;

                      const allPeersPatchesAsList = objectKeys(
                        peersPrevPatchesByClientId
                      ).reduce((prev, nextPeerId) => {
                        return [
                          ...prev,
                          ...peersPrevPatchesByClientId[nextPeerId].map(
                            (p) =>
                              ({
                                ...p.action,
                                isPrivate: undefined, // make the action public
                              } as ToPublicAction<TAction>)
                          ),
                        ];
                      }, [] as ToPublicAction<TAction>[]);

                      return {
                        ...accum,
                        [nextClientId]: {
                          actions: allPeersPatchesAsList,
                          finalChecksum:
                            nextReconciledItemFromPublicState.state[1],
                          // finalState: nextReconciledItemFromPublicState.state[0],
                        },
                      };
                    }, {} as Record<MovexClient['id'], CheckedReconciliatoryActions<TAction>>);

                    return {
                      nextPublic: {
                        checksum: nextReconciledItemFromPublicState.state[1],
                        action: publicAction,
                      },
                      nextPrivate: {
                        checksum: nextReconciledItemFromPublicState.state[1],
                        action: privateAction,
                      },
                      peerActions: {
                        type: 'reconcilable',
                        byClientId: checkedReconciliatoryActionsByClientId,
                      } as ReconcilablePeerActions,
                    } as any;
                  });
              }

              const nexForwardableActionsByClientId = objectKeys(
                stateBySubscribersId
              ).reduce((prev, nextClientId) => {
                // Exclude the sender
                if (nextClientId === clientId) {
                  return prev;
                }

                return {
                  ...prev,
                  [nextClientId]: {
                    action: publicAction,
                    checksum: stateBySubscribersId[nextClientId][1],
                    _state: stateBySubscribersId[nextClientId][0],
                  },
                };
              }, {} as ForwardablePeerActions['byClientId']);

              return new AsyncOk({
                nextPublic: {
                  checksum: nextPublicState[1],
                  action: publicAction,
                },
                nextPrivate: {
                  checksum: nextPrivateState[1],
                  action: privateAction,
                },
                peerActions: {
                  type: 'forwardable',
                  byClientId: nexForwardableActionsByClientId,
                },
              } as const);
            }
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

  addResourceSubscriber<TResourceType extends GenericResourceType>(
    rid: ResourceIdentifier<TResourceType>,
    subcriberId: MovexClient['id']
  ) {
    // TODO Optimization: The store could have the append/remove implemented so it doesn't do a round trip looking for prev
    return this.store.update(rid, (prev) => {
      return {
        ...prev,
        subscribers: {
          ...prev.subscribers,
          [subcriberId]: {
            subscribedAt: new Date().getTime(),
          },
        },
      };
    });
  }

  removeResourceSubscriber<TResourceType extends GenericResourceType>(
    rid: ResourceIdentifier<TResourceType>,
    subcriberId: MovexClient['id']
  ) {
    // TODO Optimization: The store could have the append/remove implemented so it doesn't do a round trip looking for prev
    return this.store.update(rid, (prev) => {
      const { [subcriberId]: removed, ...rest } = prev.subscribers;

      return {
        ...prev,
        subscribers: rest,
      };
    });
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
