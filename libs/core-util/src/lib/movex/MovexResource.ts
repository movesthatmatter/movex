import { StringKeys } from '../core-types';
import { invoke } from '../core-util';
import {
  getNextStateFrom,
  IObservable,
  NextStateGetter,
  Observable,
} from '../core-util/Observable';
import {
  ActionOrActionTuple,
  ActionsCollectionMapBase,
  CheckedState,
  MovexReducerMap,
} from './types';
import { computeCheckedState, createDispatcher } from './util';

// TODO: The actions should be inferred by the reducer map, since the payloads are given there, no?

// const getReducerMap = <TState>() => ({
//   increment: (state: TState, action: Action<'increment', string>) => {
//     action.type
//   }
// })

// TODO: Need to find a clean way to not have to initialize tiwht the given TState and even reducer?
export class MovexResource<
  TState,
  ActionsCollectionMap extends ActionsCollectionMapBase,
  TReducerMap extends MovexReducerMap<
    TState,
    ActionsCollectionMap
  > = MovexReducerMap<TState, ActionsCollectionMap>
> implements IObservable<CheckedState<TState>>
{
  private $checkedState: Observable<CheckedState<TState>>;

  // private $state: Observable<TState>;

  // private _dispatch
  private dispatcher: <TActionType extends StringKeys<ActionsCollectionMap>>(
    actionOrActionTuple: ActionOrActionTuple<TActionType, ActionsCollectionMap>
  ) => void;

  private unsubscribers: (() => any)[] = [];

  constructor(
    reducerMap: TReducerMap,
    initialCheckedState: CheckedState<TState>
  ) {
    this.$checkedState = new Observable(initialCheckedState);

    // this.$state = this.$checkedState.map((s) => s[0]);

    const { dispatch, unsubscribe } = createDispatcher<
      TState,
      ActionsCollectionMap
    >(this.$checkedState, reducerMap);

    this.dispatcher = dispatch;
    this.unsubscribers.push(unsubscribe);
  }

  /**
   * This is te dispatch for this Movex Resource
   */
  dispatch<TActionType extends StringKeys<ActionsCollectionMap>>(
    actionOrActionTuple: ActionOrActionTuple<TActionType, ActionsCollectionMap>
  ) {
    this.dispatcher(actionOrActionTuple);
  }

  onUpdate(fn: (state: CheckedState<TState>) => void) {
    // return this.$checkedState.onUpdate(([state]) => fn(state));
    return this.$checkedState.onUpdate(fn);
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
