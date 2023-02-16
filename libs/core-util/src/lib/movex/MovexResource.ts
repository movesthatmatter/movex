import { Pubsy } from 'ts-pubsy';
import { Err, Ok, Result } from 'ts-results';
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
  Checksum,
  DispatchedEvent,
  MovexReducerMap,
} from './types';
import {
  computeCheckedState,
  createDispatcher,
  getReducerApplicator,
  isAction,
} from './util';

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

  private pubsy = new Pubsy<{
    onDispatched: DispatchedEvent<CheckedState<TState>, ActionsCollectionMap>;
  }>();

  // private _dispatch
  private dispatcher: <TActionType extends StringKeys<ActionsCollectionMap>>(
    actionOrActionTuple: ActionOrActionTuple<TActionType, ActionsCollectionMap>
  ) => void;

  private unsubscribers: (() => any)[] = [];

  private reducerApplicator = getReducerApplicator<
    TState,
    ActionsCollectionMap
  >(this.reducerMap);

  constructor(
    private reducerMap: TReducerMap,
    initialCheckedState: CheckedState<TState>
  ) {
    this.$checkedState = new Observable(initialCheckedState);

    // this.$state = this.$checkedState.map((s) => s[0]);

    const { dispatch, unsubscribe } = createDispatcher<
      TState,
      ActionsCollectionMap
    >(this.$checkedState, reducerMap, {
      onDispatched: (p) => {
        this.pubsy.publish('onDispatched', p);
      },
    });

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

  // The diff between this and the dispatch is that this happens in sync and it returns
  // The dispatch MIGHT not happen in sync
  applyAction<TActionType extends StringKeys<ActionsCollectionMap>>(
    actionOrActionTuple: ActionOrActionTuple<TActionType, ActionsCollectionMap>
  ) {
    const nextCheckedState =
      this.getNextCheckedStateFromAction(actionOrActionTuple);

    this.$checkedState.update(nextCheckedState);

    return nextCheckedState;
  }

  reconciliateAction<TActionType extends StringKeys<ActionsCollectionMap>>(
    actionOrActionTuple: ActionOrActionTuple<TActionType, ActionsCollectionMap>,
    expectedNextChecksum: Checksum
  ): Result<CheckedState<TState>, 'ChecksumMismatch'> {
    const nextCheckedState =
      this.getNextCheckedStateFromAction(actionOrActionTuple);

    if (nextCheckedState[1] !== expectedNextChecksum) {
      return new Err('ChecksumMismatch');
    }

    this.$checkedState.update(nextCheckedState);

    return new Ok(nextCheckedState);
  }

  private getNextCheckedStateFromAction<
    TActionType extends StringKeys<ActionsCollectionMap>
  >(
    actionOrActionTuple: ActionOrActionTuple<TActionType, ActionsCollectionMap>
  ) {
    // Always apply the local action (which is the action of the private action in case of a tuple)
    const localAction = isAction(actionOrActionTuple)
      ? actionOrActionTuple
      : actionOrActionTuple[0];

    const nextState = this.reducerApplicator(
      this.getUncheckedState(),
      localAction
    );

    return computeCheckedState(nextState);
  }

  onUpdated(fn: (state: CheckedState<TState>) => void) {
    // return this.$checkedState.onUpdate(([state]) => fn(state));
    return this.$checkedState.onUpdate(fn);
  }

  onDispatched(
    fn: (
      event: DispatchedEvent<CheckedState<TState>, ActionsCollectionMap>
    ) => void
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
