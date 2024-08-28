import {
  NextStateGetter,
  GenericResourceType,
  ResourceIdentifier,
  MovexClient,
  CheckedState,
  ActionOrActionTupleFromAction,
  AnyAction,
  ToCheckedAction,
  CheckedReconciliatoryActions,
  ToPublicAction,
  MovexReducer,
  isMasterAction,
  GenericMasterAction,
  invoke,
  isAction,
  toResourceIdentifierStr,
  computeCheckedState,
  objectKeys,
  MovexMasterContext,
} from 'movex-core-util';
import { AsyncOk, AsyncResult } from 'ts-async-results';
import type { MovexStatePatch, MovexStore, MovexStoreItem } from 'movex-store';
import {
  applyMovexStatePatches,
  getMovexStatePatch,
  getUuid,
  parseMasterAction,
} from './util';

/**
 * This Class works with a Resource Type (not Resource Identifier),
 * and thus is able to handle all resources of type at the same time,
 * b/c it runs on the backend (most likely, but it could also be run on the client)
 */
export class MovexMasterResource<
  TState,
  TAction extends AnyAction = AnyAction
> {
  constructor(
    private reducer: MovexReducer<TState, TAction>,
    private store: MovexStore<Record<string, MovexReducer<TState, TAction>>>
  ) {}

  private computeClientState(
    clientId: MovexClient['id'],
    item: MovexStoreItem<TState>,
    masterContext: MovexMasterContext
  ) {
    const patches = item.patches?.[clientId];
    if (patches) {
      return this.applyStateTransformer(
        computeCheckedState(this.mergeStatePatches(item.state[0], patches)),
        masterContext
      );
    }

    return this.applyStateTransformer(item.state, masterContext);
  }

  private applyStateTransformer(
    checkedState: CheckedState<TState>,
    masterContext: MovexMasterContext
  ): CheckedState<TState> {
    if (typeof this.reducer.$transformState === 'function') {
      // const masterContext: MovexMasterContext = {
      //   now: () => new Date().getTime(), // Should the context just be defined here?,
      //   requestAt:
      // };

      console.trace(
        '[Movex-master] applyStateTransformer',
        JSON.stringify({ masterContext })
      );

      return computeCheckedState(
        this.reducer.$transformState(checkedState[0], masterContext)
      );
    }

    return checkedState;
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

  /**
   * Gets the Raw Item as saved in the store - NOT TO BE SENT TO THE CLIENT
   *
   * @param rid
   * @returns
   */
  private getStoreItem<TResourceType extends GenericResourceType>(
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
    rid: ResourceIdentifier<TResourceType>,
    masterContext: MovexMasterContext
  ) {
    // TODO: Here probably should include the id!
    //   at this level or at the store level?
    // Sometime the state could have it's own id but not always and it should be given or not? :/
    return this.getStoreItem(rid)
      .map((r) => r.state)
      .map((s) => this.applyStateTransformer(s, masterContext));
  }

  /**
   * This gets the public state or the client private state if
   *  there are any private state for the given clientId
   *
   * @param rid
   * @param clientId
   * @returns
   */
  getClientSpecificState<TResourceType extends GenericResourceType>(
    rid: ResourceIdentifier<TResourceType>,
    clientId: MovexClient['id'],
    masterContext: MovexMasterContext
  ) {
    return this.getClientSpecificResource(rid, clientId, masterContext).map(
      (s) => s.state
    );
  }

  /**
   * This gets the resource with the computed state for the current connected client
   *
   * @param rid
   * @param clientId
   */
  public getClientSpecificResource<TResourceType extends GenericResourceType>(
    rid: ResourceIdentifier<TResourceType>,
    clientId: MovexClient['id'],
    masterContext: MovexMasterContext
  ) {
    return this.store.get(rid, clientId).map((item) => ({
      ...item,
      state: this.computeClientState(clientId, item, masterContext),
    }));
  }

  private getStateBySubscriberId<TResourceType extends GenericResourceType>(
    rid: ResourceIdentifier<TResourceType>,
    masterContext: MovexMasterContext
  ) {
    return this.getStoreItem(rid).map((item) =>
      this.computeStateForItemSubscribers(item, masterContext)
    );
  }

  private computeStateForItemSubscribers<
    TResourceType extends GenericResourceType
  >(
    item: MovexStoreItem<TState, TResourceType>,
    masterContext: MovexMasterContext
  ) {
    return objectKeys(item.subscribers).reduce(
      (prev, nextClientId) => ({
        ...prev,
        [nextClientId]: this.computeClientState(
          nextClientId,
          item,
          masterContext
        ),
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
    actionOrActionTuple: ActionOrActionTupleFromAction<TAction>,
    masterContext: MovexMasterContext
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

    type ResponsePayload = {
      nextPublic: ToCheckedAction<TAction> & { wasMasterAction?: boolean };
      nextPrivate?: ToCheckedAction<TAction>;
      peerActions: PeerActions;
    };

    return this.getClientSpecificResource(rid, clientId, masterContext).flatMap<
      ResponsePayload,
      unknown
    >((resource) => {
      const prevState = resource.state[0];

      if (isAction(actionOrActionTuple)) {
        const publicAction = invoke(() => {
          if (isMasterAction(actionOrActionTuple)) {
            return {
              wasMasterAction: true,
              action: parseMasterAction(
                actionOrActionTuple as GenericMasterAction
              ) as TAction,
            };
          }

          return {
            action: actionOrActionTuple,
          };
        });

        return this.store
          .updateState(rid, this.reducer(prevState, publicAction.action))
          .map(
            (nextPublicState): ResponsePayload => ({
              nextPublic: {
                checksum: nextPublicState.state[1],
                action: publicAction.action,
                wasMasterAction: publicAction.wasMasterAction,
              },
              peerActions: {
                type: 'forwardable',
                byClientId: objectKeys(resource.subscribers).reduce(
                  (prev, nextClientId) => {
                    // Exclude the sender
                    if (nextClientId === clientId) {
                      return prev;
                    }

                    return {
                      ...prev,
                      [nextClientId]: {
                        checksum: nextPublicState.state[1],
                        action: publicAction.action,
                      },
                    };
                  },
                  {} as ForwardablePeerActions['byClientId']
                ),
              },
            })
          );
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

              this.getClientSpecificState(rid, clientId, masterContext),

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
              this.getStateBySubscriberId(rid, masterContext)
            )
          )
          // Reconciliation Step
          .flatMap<ResponsePayload, unknown>(
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
                    } satisfies ResponsePayload;
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

  private update<TResourceType extends GenericResourceType>(
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
    return this.store
      .update(rid, (prev) => ({
        ...prev,
        subscribers: {
          ...prev.subscribers,
          [subcriberId]: {
            subscribedAt: new Date().getTime(),
          },
        },
      }))
      .map((s) => s.subscribers);
  }

  removeResourceSubscriber<TResourceType extends GenericResourceType>(
    rid: ResourceIdentifier<TResourceType>,
    subcriberId: MovexClient['id']
  ) {
    // TODO Optimization: The store could have the append/remove implemented so it doesn't do a round trip looking for prev
    return this.store
      .update(rid, (prev) => {
        const { [subcriberId]: removed, ...rest } = prev.subscribers;

        return {
          ...prev,
          subscribers: rest,
        };
      })
      .map((s) => s.subscribers);
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
