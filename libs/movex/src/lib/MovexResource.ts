import { Pubsy } from 'ts-pubsy';
import { Err, Ok, Result } from 'ts-results';
import {
  getNextStateFrom,
  invoke,
  IObservable,
  NextStateGetter,
  Observable,
} from 'movex-core-util';
import { computeCheckedState } from './util';
import {
  ActionOrActionTupleFromAction,
  AnyAction,
  isAction,
  ToCheckedAction,
  ToPrivateAction,
  ToPublicAction,
} from './tools/action';
import { CheckedState } from './core-types';
import { createDispatcher, DispatchedEvent } from './tools/dispatch';
import { MovexReducer } from './tools/reducer';

// TODO Feb 25th
// Today I'm changing the way the reducer works from now, it's simply a redux redcuer of shape (state, action) and both the state and action are defined
//  at creation time
// and the actions are created by the users, movex.createAction maybe, or can even do a deox if needed but not worrying ab that!
// This is easier to reason about, easier to work with and to get adopted as it's redux or useReducer

// This has the old way of dealing with map actions
// But that was pretty hard to type and not in line with useReducer and Redux
// If something like that is needed I can just use deox, which makes more sense since it's just simpler to reason about as well as in line with the whole redusx reducer

// TODO: Now extracat all the given actions into the dispatch
export class MovexResource<TState = any, TAction extends AnyAction = AnyAction>
  implements IObservable<CheckedState<TState>>
{
  private $checkedState: Observable<CheckedState<TState>>;

  private pubsy = new Pubsy<{
    onDispatched: DispatchedEvent<CheckedState<TState>, TAction>;
  }>();

  private dispatcher: (
    actionOrActionTuple: ActionOrActionTupleFromAction<TAction>
  ) => void;

  private unsubscribers: (() => any)[] = [];

  constructor(
    private reducer: MovexReducer<TState, TAction>,

    // Passing undefined here in order to get the default state
    initialCheckedState = computeCheckedState(
      reducer(undefined as TState, { type: '_init' } as TAction)
    )
  ) {
    // TODO: Not sure this will alawys work correctly as we need to get the initial state somehow
    this.$checkedState = new Observable(initialCheckedState);

    // this.$state = this.$checkedState.map((s) => s[0]);

    const { dispatch, unsubscribe } = createDispatcher<TState, TAction>(
      this.$checkedState,
      this.reducer,
      {
        onDispatched: (p) => {
          this.pubsy.publish('onDispatched', p);
        },
      }
    );

    this.dispatcher = dispatch;
    this.unsubscribers.push(unsubscribe);
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

  /**
   * The diffence between this and the dispatch is that this happens in sync and returns the next state,
   * while dispatch() MIGHT not happen in sync and doesn't return
   *
   * @param actionOrActionTuple
   * @returns
   */
  applyAction(actionOrActionTuple: ActionOrActionTupleFromAction<TAction>) {
    const nextCheckedState =
      this.getNextCheckedStateFromAction(actionOrActionTuple);
    this.$checkedState.update(nextCheckedState);

    return nextCheckedState;
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

    const nextState = this.reducer(
      this.getUncheckedState(),
      localAction as TAction
    );

    return computeCheckedState(nextState);
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

  // This to be called when destroying not used anymore in order to clean the update subscriptions
  destroy() {
    this.unsubscribers.forEach(invoke);
  }
}
