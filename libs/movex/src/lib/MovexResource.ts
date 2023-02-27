import { Pubsy } from 'ts-pubsy';
import { Err, Ok, Result } from 'ts-results';
import {
  getNextStateFrom,
  invoke,
  IObservable,
  NextStateGetter,
  NotUndefined,
  Observable,
} from 'movex-core-util';
import { computeCheckedState } from './util';
import {
  Action,
  ActionOrActionTupleFromAction,
  AnyAction,
  AnyActionOrActionTuple,
  AnyCheckedAction,
  isAction,
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

  constructor(private reducer: MovexReducer<TState, TAction>) {
    // Passing undefined here in order to get the default state
    const initialState = reducer(
      undefined as TState,
      { type: '_init' } as TAction
    ); // This returns the initial state

    // TODO: Not sure this will alawys work correctly as we need to get the initial state somehow
    this.$checkedState = new Observable(computeCheckedState(initialState));

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
  dispatch(actionOrActionTuple: ActionOrActionTupleFromAction<TAction>) {
    this.dispatcher(actionOrActionTuple);
  }

  /**
   * The diffence between this and the dispatch is that this happens in sync and returns the next state,
   * while dispatch() MIGHT not happen in sync and doesn't return
   *
   * @param actionOrActionTuple
   * @returns
   */
  applyAction(actionOrActionTuple: AnyActionOrActionTuple) {
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
    checkedAction: AnyCheckedAction
  ): Result<CheckedState<TState>, 'ChecksumMismatch'> {
    const nextCheckedState = this.getNextCheckedStateFromAction(
      checkedAction.action
    );

    if (nextCheckedState[1] !== checkedAction.checksum) {
      return new Err('ChecksumMismatch');
    }

    this.$checkedState.update(nextCheckedState);

    return new Ok(nextCheckedState);
  }

  private getNextCheckedStateFromAction(
    actionOrActionTuple: AnyActionOrActionTuple
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

// type State = {
//   counter: 0;
// };

// type IncrementAction = Action<'increment'>;

// const incrementAction: IncrementAction = {
//   type: 'increment',
// };

// const withAction = (a: AnyAction) => a;

// withAction(incrementAction);

// const defaultState: State = {
//   counter: 0,
// };

// // This is what gets saved and run on both client and server, just this little file
// const incrementReducer = (
//   state = defaultState,
//   action: Action<'increment'> // | Action<'incrementBy', number>
// ) => {
//   return state;
// };

// type GameState = {
//   name: 'maha';
// };

// const defaultGameState: GameState = {
//   name: 'maha',
// };

// const gameReducer = (
//   state = defaultGameState,
//   action:
//     | Action<'move'>
//     | Action<'attack', { coord: string }>
//     | Action<'incrementBy', number>
// ) => {
//   if (action.type === 'attack') {
//     action.payload.coord;
//   }

//   return state;
// };

// const acceptReducer = <S, A extends AnyAction>(reducer: MovexReducer<S, A>) => {
//   type Distribute<U> = U extends Action<string, NotUndefined> ? U : U;

//   return {} as {
//     s: Parameters<typeof reducer>[0];
//     a: Parameters<typeof reducer>[1];
//     as: Distribute<Parameters<typeof reducer>[1]>;
//   };
// };

// acceptReducer(gameReducer).as;

// const xRes = new MovexResource(gameReducer); // This will workaas well

// xRes.dispatch({
//   type: 'move',
// });
// xRes.dispatch({
//   type: ''
// })

// const createReducer = <TState extends MovexState>(
//   state: TState,
//   fn: (state: TState, action: AnyAction) => TState
// ) => {
//   return fn(state, action);
// };

// This is what a reducer file looks like
// export default createReducer<IncrementAction>({ counter: 0 }, (state, action) => {
//   return state;
// });

// reducer({ counter: 0 }, incrementAction);

// const xRes = new MovexResource(reducer); // This will workaas well

// TODO: here the dispatch could actually infer all the actions from the passed Action Type
// Probably, but this is later on, it should work w/o that inference just like reduc
// xRes.dispatch({ type: '' });
