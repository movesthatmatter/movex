import {
  MovexStore,
  NextStateGetter,
  GenericResourceType,
  ResourceIdentifier,
  MovexClient,
  MovexStoreItem,
} from 'movex-core-util';
import { AsyncOk, AsyncResult } from 'ts-async-results';
import {
  ActionOrActionTupleFromAction,
  ActionTupleFrom,
  AnyAction,
  isAction,
  ToPrivateAction,
  ToPublicAction,
} from './tools/action';
import { MovexReducer } from './tools/reducer';
import {
  applyMovexStatePatches,
  computeCheckedState,
  getMovexStatePatch,
} from './util';

/**
 * This Class works with a Resource Type (not Resource Identifier),
 * and thus is able to handle all resource of type at a time, b/c it runs
 * on the backend (most likely)
 */
export class MovexMaster<
  TState extends any,
  TAction extends AnyAction = AnyAction
> {
  constructor(
    private reducer: MovexReducer<TState, TAction>,
    private store: MovexStore<TState>
  ) {}

  /**
   * This gets the public state or the client private state if
   *  there are any private state for the given clientId
   *
   * @param rid
   * @param clientId
   * @returns
   */
  get<TResourceType extends GenericResourceType>(
    rid: ResourceIdentifier<TResourceType>,
    clientId: MovexClient['id']
  ) {
    return this.store.get(rid, clientId).map((resource) => {
      const patches = resource.patches?.[`:client:${clientId}`];
      if (patches) {
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
          resource.state[0],
          patches.map((p) => p.patch)
        );

        // Should the checksum compute happen each time or should it be stored?
        return computeCheckedState(reconciledState);
      }

      return resource.state;
    });
  }

  getPublic<TResourceType extends GenericResourceType>(
    rid: ResourceIdentifier<TResourceType>
  ) {
    // TODO: Here probably should include the id!
    //   at this level or at the store level?
    // Sometime the state could have it's own id but not always and it should be given or not? :/
    return this.store.get(rid).map((r) => r.state);
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
    return this.get(rid, clientId).flatMap<
      {
        nextPublic: {
          item: MovexStoreItem<TState>;
          action: ToPublicAction<TAction>;
        };
        nextPrivate?: {
          item: MovexStoreItem<TState>;
          action: ToPrivateAction<TAction>;
        };
      },
      unknown
    >(([prevState]) => {
      if (isAction(actionOrActionTuple)) {
        const publicAction = actionOrActionTuple;
        return this.store
          .update(rid, this.reducer(prevState, publicAction))
          .map((nextPublicState) => ({
            nextPublic: {
              item: nextPublicState,
              action: publicAction,
            },
          }));
      }

      const [privateAction, publicAction] = actionOrActionTuple;

      const privatePatch = getMovexStatePatch(
        prevState,
        this.reducer(prevState, privateAction)
      );

      const nextPublicState = this.reducer(prevState, publicAction);

      return this.store
        .addPrivatePatch(rid, `:client:${clientId}`, {
          action: privateAction,
          patch: privatePatch,
        })
        .flatMap((privateState) =>
          AsyncResult.all(
            new AsyncOk(privateState),

            // Note The Public Action needs to get applied after the private one!
            this.store.update(rid, nextPublicState)
          )
        )
        .map(([nextPrivateState, nextPublicState]) => ({
          nextPublic: {
            item: nextPublicState,
            action: publicAction,
          },
          nextPrivate: {
            item: nextPrivateState,
            action: privateAction,
          },
        }));
    });
  }

  // TODO: The ResourceType could be generic, or given in the Class Generic
  // getUncheckedState<TResourceType extends GenericResourceType>(
  //   rid: ResourceIdentifier<TResourceType>
  // ) {
  //   return this.store.get(rid).map((s) => s.state[0]);
  // }

  update<TResourceType extends GenericResourceType>(
    id: ResourceIdentifier<TResourceType>,
    nextStateGetter: NextStateGetter<TState>
  ) {
    return this.store.update(id, nextStateGetter);
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
