import { Pubsy } from 'ts-pubsy';
import { Err, Ok, Result } from 'ts-results';
import {
  getNextStateFrom,
  invoke,
  IObservable,
  logsy,
  MovexClient,
  NextStateGetter,
  Observable,
  ResourceIdentifier,
} from 'movex-core-util';
import { computeCheckedState } from '../util';
import {
  ActionOrActionTupleFromAction,
  AnyAction,
  isAction,
  ToCheckedAction,
  ToPrivateAction,
  ToPublicAction,
} from '../tools/action';
import { CheckedState, UnsubscribeFn } from '../core-types';
import { createDispatcher, DispatchedEvent } from '../tools/dispatch';
import { MovexReducer } from '../tools/reducer';
import { PromiseDelegate } from 'promise-delegate';

/**
 * This is the MovexResource running on the Client
 */
export class MovexResourceObservable<
  TState = any,
  TAction extends AnyAction = AnyAction
> implements IObservable<CheckedState<TState>>
{
  /**
   * This flag simply states if the resource is synched with the remote.
   * It starts as false and it waits for at least one "sync" or "update" call.
   *
   * For now it never goes from true to false but that could be a valid use case in the future.
   */
  private isSynchedPromiseDelegate = new PromiseDelegate();

  private $checkedState: Observable<CheckedState<TState>>;

  private pubsy = new Pubsy<{
    onDispatched: DispatchedEvent<CheckedState<TState>, TAction>;
  }>();

  // client: MovexResourceClient;

  private dispatcher: (
    actionOrActionTuple: ActionOrActionTupleFromAction<TAction>
  ) => void;

  private unsubscribers: UnsubscribeFn[] = [];

  constructor(
    private clientId: MovexClient['id'],
    public rid: ResourceIdentifier<string>,
    private reducer: MovexReducer<TState, TAction>,

    // Passing undefined here in order to get the default state
    initialCheckedState = computeCheckedState(
      reducer(undefined as TState, { type: '_init' } as TAction)
    )
  ) {
    this.$checkedState = new Observable(initialCheckedState);

    // // When the master io returns the async state, update it!
    // masterConnection.getResourceState().map((state) => {
    //   this.$checkedState.update(state);
    // });

    // TODO: Add Use case for how to deal with creation. When the get doesn't return anything?!
    // something like: if it returns record doesnt exist, use create instead of get? or io.getOrCreate()?

    const { dispatch, unsubscribe: unsubscribeFromDispatch } = createDispatcher<
      TState,
      TAction
    >(this.$checkedState, this.reducer, {
      onDispatched: (p) => {
        this.pubsy.publish('onDispatched', p);
      },
    });

    this.dispatcher = (...args: Parameters<typeof dispatch>) => {
      if (!this.isSynchedPromiseDelegate.settled) {
        logsy.info('[Movex] Attempt to dispatch before sync!', ...args);
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
  dispatch(action: ToPublicAction<TAction>) {
    this.dispatcher(action);
  }

  dispatchPrivate(
    privateAction: ToPrivateAction<TAction>,
    publicAction: ToPublicAction<TAction>
  ) {
    this.dispatcher([privateAction, publicAction]);
  }

  applyMultipleActions(actions: ToPublicAction<TAction>[]) {
    const nextState = actions.reduce(
      (prev, action) => this.computeNextState(prev, action),
      this.getUncheckedState()
    );

    return this.$checkedState.update(computeCheckedState(nextState)).get();
  }

  /**
   * Same as applyAction() except it fails on mismatching checksums
   *
   * @param actionOrActionTuple
   * @param expectedNextChecksum
   * @returns
   */
  reconciliateAction(
    checkedAction: ToCheckedAction<TAction>
  ): Result<CheckedState<TState>, 'ChecksumMismatch'> {
    const nextCheckedState = this.getNextCheckedStateFromAction(
      // Maybe worth making it a real public action but it's just for types
      checkedAction.action as ToPublicAction<TAction>
    );

    if (nextCheckedState[1] !== checkedAction.checksum) {
      return new Err('ChecksumMismatch');
    }

    this.$checkedState.update(nextCheckedState);

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
      this.computeNextState(this.getUncheckedState(), localAction)
    );
  }

  private computeNextState(prevState: TState, action: TAction) {
    return this.reducer(prevState, action);
  }

  onUpdated(fn: (state: CheckedState<TState>) => void) {
    // return this.$checkedState.onUpdate(([state]) => fn(state));
    return this.$checkedState.onUpdate(fn);
  }

  onDispatched(
    fn: (event: DispatchedEvent<CheckedState<TState>, TAction>) => void
  ) {
    return this.pubsy.subscribe('onDispatched', fn);
  }

  get() {
    return this.$checkedState.get();
  }

  getUncheckedState() {
    return this.$checkedState.get()[0];
  }

  // This is the actual checked state. TODO: Not sure about the names yet
  get state() {
    return this.get();
  }

  // This is the actual unchecked state. TODO: Not sure about the names yet
  get unckeckedState() {
    return this.getUncheckedState();
  }

  /**
   * This needs to be called each time master has emits an updated state.
   * The dispatch won't work without it being called at least once.
   *
   * @param nextStateGetter
   * @returns
   */
  sync(nextStateGetter: NextStateGetter<CheckedState<TState>>) {
    const res = this.update(nextStateGetter);

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

  update(nextStateGetter: NextStateGetter<CheckedState<TState>>) {
    this.$checkedState.update(getNextStateFrom(this.get(), nextStateGetter));

    return this;
  }

  updateUncheckedState(nextStateGetter: NextStateGetter<TState>) {
    return this.update(
      computeCheckedState(
        getNextStateFrom(this.getUncheckedState(), nextStateGetter)
      )
    );
  }

  // This to be called when the obervable is not used anymore in order to clean the update subscriptions
  destroy() {
    this.unsubscribers.forEach(invoke);
  }
}
