import { Pubsy } from 'ts-pubsy';
import { Err, Ok, Result } from 'ts-results';
import {
  invoke,
  globalLogsy,
  computeCheckedState,
  isAction,
  Observable,
  SanitizedMovexClient,
  MovexMasterContext,
  checkedStateEquals,
} from 'movex-core-util';
import type {
  IObservable,
  MovexClient,
  NextStateGetter,
  ResourceIdentifier,
  CheckedState,
  UnsubscribeFn,
  ActionOrActionTupleFromAction,
  AnyAction,
  ToCheckedAction,
  ToPrivateAction,
  ToPublicAction,
  MovexReducer,
} from 'movex-core-util';
import {
  createDispatcher,
  DispatchedEventPayload,
  DispatchFn,
  DispatchPublicFn,
} from './dispatch';
import { PromiseDelegate } from 'promise-delegate';

const logsy = globalLogsy.withNamespace('[MovexResourceObservable]');

type ObservedItem<TState> = {
  subscribers: Record<MovexClient['id'], SanitizedMovexClient>;
  checkedState: CheckedState<TState>;
};

/**
 * This is the MovexResource running on the Client
 */
export class MovexResourceObservable<
  TState = any,
  TAction extends AnyAction = AnyAction
> implements IObservable<ObservedItem<TState>>
{
  /**
   * This flag informs that the resource (client) is in sync with the master.
   * It starts as false and it waits for at least one "sync" or "update" call.
   *
   * For now it never goes from true to false but that could be a valid use case in the future.
   */
  private isSynchedPromiseDelegate = new PromiseDelegate();

  private $item: Observable<ObservedItem<TState>>;

  private pubsy = new Pubsy<{
    onDispatched: DispatchedEventPayload<CheckedState<TState>, TAction>;
  }>();

  private dispatcher: DispatchFn<TAction>;

  private unsubscribers: UnsubscribeFn[] = [];

  constructor(
    private clientId: MovexClient['id'],
    public rid: ResourceIdentifier<string>,
    private reducer: MovexReducer<TState, TAction>,

    initialSubscribers: Record<MovexClient['id'], SanitizedMovexClient> = {},

    // Passing undefined here in order to get the default state
    initialCheckedState = computeCheckedState(
      reducer(undefined as TState, { type: '_init' } as TAction)
    )
  ) {
    this.$item = new Observable({
      subscribers: initialSubscribers,
      checkedState: initialCheckedState,
    });

    // // When the master io returns the async state, update it!
    // masterConnection.getResourceState().map((state) => {
    //   this.$checkedState.update(state);
    // });

    // TODO: Add Use case for how to deal with creation. When the get doesn't return anything?!
    // something like: if it returns record doesnt exist, use create instead of get? or io.getOrCreate()?

    const $checkedState = this.$item.map((s) => s.checkedState);

    // Propagate the updates up to the root $item, but ensure it doesn't get into a loop
    $checkedState.onUpdate((nextCheckedState) => {
      // Ensure it's not equal otherwise it goes into an infinite updating loop
      if (nextCheckedState !== this.$item.get().checkedState) {
        this.$item.update((prev) => ({
          ...prev,
          checkedState: nextCheckedState,
        }));
      }
    });

    const { dispatch, unsubscribe: unsubscribeFromDispatch } = createDispatcher<
      TState,
      TAction
    >($checkedState, this.reducer, {
      onDispatched: (p) => {
        this.pubsy.publish('onDispatched', p);
      },
    });

    this.dispatcher = (...args: Parameters<typeof dispatch>) => {
      if (!this.isSynchedPromiseDelegate.settled) {
        logsy.warn('Attempt to dispatch before sync!', { args });
      }

      this.isSynchedPromiseDelegate.promise.then(() => {
        dispatch(...args);
      });
    };

    this.unsubscribers.push(unsubscribeFromDispatch);
  }

  /**
   * This is the dispatch for this Movex Resource
   */
  dispatch(...args: Parameters<DispatchPublicFn<TAction>>) {
    return this.dispatcher(...args);
  }

  dispatchPrivate(
    privateAction: ToPrivateAction<TAction>,
    publicAction: ToPublicAction<TAction>
  ) {
    return this.dispatcher([privateAction, publicAction]);
  }

  applyMultipleActions(actions: ToPublicAction<TAction>[]) {
    const nextState = actions.reduce(
      (prev, action) => this.computeNextState(prev, action),
      this.getUnwrappedState()
    );

    return this.$item
      .update((prev) => ({
        ...prev,
        checkedState: computeCheckedState(nextState),
      }))
      .get();
  }

  /**
   * Same as applyAction() except it fails on mismatching checksums
   *
   * @param actionOrActionTuple
   * @param expectedNextChecksum
   * @returns
   */
  reconciliateAction(
    checkedAction: ToCheckedAction<TAction>,
    masterContext: MovexMasterContext
  ): Result<CheckedState<TState>, 'ChecksumMismatch'> {
    const nextCheckedState = this.applyStateTransformerToCheckedState(
      this.getNextCheckedStateFromAction(
        // Maybe worth making it a real public action but it's just for types
        checkedAction.action as ToPublicAction<TAction>
      ),
      masterContext
    );

    if (nextCheckedState[1] !== checkedAction.checksum) {
      return new Err('ChecksumMismatch');
    }

    // this.$checkedState.update(nextCheckedState);
    this.$item.update((prev) => ({
      ...prev,
      checkedState: nextCheckedState,
    }));

    return new Ok(nextCheckedState);
  }

  private getNextCheckedStateFromAction(
    actionOrActionTuple: ActionOrActionTupleFromAction<TAction>
  ) {
    // Always apply the local action (which is the action of the private action in case of a tuple)
    const localAction = isAction(actionOrActionTuple)
      ? actionOrActionTuple
      : actionOrActionTuple[0];

    return computeCheckedState(
      this.computeNextState(this.getUnwrappedState(), localAction)
    );
  }

  private computeNextState(prevState: TState, action: TAction) {
    return this.reducer(prevState, action);
  }

  /**
   * Subscribe to State updates
   *
   * @param fn
   * @returns
   */
  onUpdate(
    fn: (p: {
      subscribers: Record<MovexClient['id'], SanitizedMovexClient>;
      checkedState: CheckedState<TState>;
    }) => void
  ) {
    return this.$item.onUpdate(fn);
  }

  onDispatched(
    fn: (event: DispatchedEventPayload<CheckedState<TState>, TAction>) => void
  ) {
    return this.pubsy.subscribe('onDispatched', fn);
  }

  get() {
    return this.$item.get();
  }

  getCheckedState() {
    return this.get().checkedState;
  }

  getUnwrappedState() {
    return this.getCheckedState()[0];
  }

  /**
   * This needs to be called each time master emits an updated state.
   * The dispatch won't work without it being called at least once.
   *
   * @param nextStateGetter
   * @returns
   */
  syncState(nextStateGetter: NextStateGetter<CheckedState<TState>>) {
    const res = this.updateCheckedState(nextStateGetter);
    this.isSynchedPromiseDelegate.resolve();

    return res;
  }

  setUnsync() {
    if (this.isSynchedPromiseDelegate.settled) {
      this.isSynchedPromiseDelegate = new PromiseDelegate();
    }
  }

  /**
   * If set to false it doesn't wait for the master state to be synced
   * Good for tests at least. If not for anythign else, need to rethink it.
   *
   * @param flag
   */
  setMasterSyncing(flag: boolean) {
    if (flag === true) {
      this.isSynchedPromiseDelegate = new PromiseDelegate();
    } else {
      this.isSynchedPromiseDelegate.resolve();
    }
  }

  update(nextStateGetter: NextStateGetter<ObservedItem<TState>>) {
    this.$item.update((prev) =>
      Observable.getNextStateFrom(prev, nextStateGetter)
    );
  }

  private updateCheckedState(
    nextStateGetter: NextStateGetter<CheckedState<TState>>
  ) {
    return this.update((prev) => ({
      ...prev,
      checkedState: Observable.getNextStateFrom(
        prev.checkedState,
        nextStateGetter
      ),
    }));
  }

  updateUnwrappedState(nextStateGetter: NextStateGetter<TState>) {
    return this.update((prev) => ({
      ...prev,
      checkedState: computeCheckedState(
        Observable.getNextStateFrom(prev.checkedState[0], nextStateGetter)
      ),
    }));
  }

  updateSubscribers(
    nextStateGetter: NextStateGetter<ObservedItem<TState>['subscribers']>
  ) {
    return this.update((prev) => ({
      ...prev,
      subscribers: Observable.getNextStateFrom(
        prev.subscribers,
        nextStateGetter
      ),
    }));
  }

  applyStateTransformer(
    masterContext: MovexMasterContext
  ): CheckedState<TState> {
    const prevCheckedState = this.getCheckedState();

    const nextCheckedState = this.applyStateTransformerToCheckedState(
      prevCheckedState,
      masterContext
    );

    if (!checkedStateEquals(nextCheckedState, prevCheckedState)) {
      this.updateCheckedState(nextCheckedState);

      return this.getCheckedState();
    }

    return prevCheckedState;
  }

  private applyStateTransformerToCheckedState(
    checkedState: CheckedState<TState>,
    masterContext: MovexMasterContext
  ) {
    if (typeof this.reducer.$transformState === 'function') {
      const nextCheckedState = computeCheckedState(
        this.reducer.$transformState(checkedState[0], masterContext)
      );

      return nextCheckedState;
    }

    return checkedState;
  }

  applyStateTransformerToCheckedStateAndUpdate(
    checkedState: CheckedState<TState>,
    masterContext: MovexMasterContext
  ) {
    const nextCheckedState = this.applyStateTransformerToCheckedState(
      checkedState,
      masterContext
    );

    const prevCheckedState = this.getCheckedState();

    if (!checkedStateEquals(nextCheckedState, prevCheckedState)) {
      this.updateCheckedState(nextCheckedState);
    }

    return this.getCheckedState();
  }

  // This to be called when the obervable is not used anymore in order to clean the update subscriptions
  destroy() {
    this.unsubscribers.forEach(invoke);
  }
}
