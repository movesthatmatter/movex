import hash from 'object-hash';
import { StringKeys } from '../core-types';
import {
  invoke,
  isObject,
  keyInObject,
  noop,
  NotUndefined,
} from '../core-util';
import { Observable } from '../core-util/Observable';
import {
  ActionsCollectionMapBase,
  AnyActionOf,
  AnyPublicActionOf,
  GenericPrivateAction,
  GenericPublicAction,
} from '../resource-reducer';
import {
  Action,
  ActionOrActionTuple,
  AnyActionOrActionTupleOf,
  CheckedState,
  DispatchedEvent,
  GenericAction,
  MovexReducerMap,
  MovexState,
} from './types';
import microdiff from 'microdiff';
import micropatch from 'micropatch';

export const hashObject = (val: NotUndefined) => hash.MD5(val);

export const isAction = (a: unknown): a is GenericAction => {
  return isObject(a) && keyInObject(a, 'type') && keyInObject(a, 'payload');
};

export const createMovexReducerMap = <
  ActionsCollectionMap extends ActionsCollectionMapBase,
  TState extends MovexState
>(
  initialState: TState
) => {
  // Do we need to do smtg with the initialState?

  return <TReducerMap extends MovexReducerMap<TState, ActionsCollectionMap>>(
    reducerMap: TReducerMap
  ) => reducerMap;
};

// Here - it needs to handle the private action one as well
// NEXT - Implement this on the backend and check public/private
// Next Next - implement in on maha and change the whole game strategy to this
export const createDispatcher = <
  TState extends MovexState,
  ActionsCollectionMap extends ActionsCollectionMapBase,
  TReducerMap extends MovexReducerMap<
    TState,
    ActionsCollectionMap
  > = MovexReducerMap<TState, ActionsCollectionMap>
>(
  $checkedState: Observable<CheckedState<TState>>,
  reducerMap: TReducerMap,
  onEvents?: {
    // This will be called any time an action got dispatched
    // Even if the state didn't update!
    // This is in order to have more control at the client's end. where they can easily check the checksum's or even instance
    //  if there was any update
    onDispatched?: (
      event: DispatchedEvent<CheckedState<TState>, ActionsCollectionMap>
    ) => void;
    onStateUpdated?: (
      event: DispatchedEvent<CheckedState<TState>, ActionsCollectionMap>
    ) => void;
  }
) => {
  const { onDispatched = noop, onStateUpdated = noop } = onEvents || {};

  // the actions that were batched before the initial state had a chance to resolve
  let prebatchedActions: (
    | GenericPublicAction
    | GenericPrivateAction
    | [GenericPrivateAction, GenericPublicAction]
  )[] = [];

  // let { item: prevState } = await initialResource;
  // let prevState: TResource['item'];
  // let prevChecksum: string;

  // let currentStateAndChecksum: StateAndChecksum<TResource['item']>;
  let currentCheckedState: CheckedState<TState>;

  let initiated = false;

  const onStateReceived = (checkedState: CheckedState<TState>) => {
    // console.log('on (next) state received', checkedState);

    currentCheckedState = checkedState;

    initiated = true;

    // If there are any prebatched actions simply call dispatch with all of them
    if (prebatchedActions.length > 0) {
      prebatchedActions.forEach((actionOrActions) => {
        dispatch(actionOrActions as any); // FIX this type
      });

      prebatchedActions = [];
    }
  };

  const unsubscribeStateUpdates = $checkedState.onUpdate(onStateReceived);

  onStateReceived($checkedState.get());

  const applyAction = getReducerApplicator<TState, ActionsCollectionMap>(
    reducerMap
  );

  const dispatch = <TActionType extends StringKeys<ActionsCollectionMap>>(
    actionOrActionTuple: ActionOrActionTuple<TActionType, ActionsCollectionMap>
  ) => {
    const [localAction, remoteAction] = invoke(() => {
      if (isAction(actionOrActionTuple)) {
        return [actionOrActionTuple];
      }

      return actionOrActionTuple;
    });

    if (!initiated) {
      prebatchedActions.push(actionOrActionTuple);

      return;
    }

    const nextCheckedState = computeCheckedState(
      applyAction(currentCheckedState[0], localAction)
    );

    onDispatched({
      next: nextCheckedState,
      prev: currentCheckedState,
      action: actionOrActionTuple,
    });

    if (!checkedStateEquals(currentCheckedState, nextCheckedState)) {
      onStateUpdated({
        next: nextCheckedState,
        prev: currentCheckedState,
        action: actionOrActionTuple,
      });

      // console.log('going to update', nextCheckedState);
      $checkedState.update(nextCheckedState);

      // Only if different update them
      // currentCheckedState = nextCheckedState;
    }
  };

  return { dispatch, unsubscribe: unsubscribeStateUpdates };
};

export const getReducerApplicator =
  <
    TState extends MovexState,
    ActionsCollectionMap extends ActionsCollectionMapBase,
    TReducerMap extends MovexReducerMap<
      TState,
      ActionsCollectionMap
    > = MovexReducerMap<TState, ActionsCollectionMap>
  >(
    reducerMap: TReducerMap
  ) =>
  <TActionType extends StringKeys<ActionsCollectionMap>>(
    state: TState,
    action: Action<TActionType, ActionsCollectionMap[TActionType]>
  ) => {
    const reducer = reducerMap[action.type];

    if (!reducer) {
      return state;
    }

    // This is actually the next state
    return reducer(state, action);
  };

export const computeCheckedState = <T>(state: T): CheckedState<T> => [
  state,
  state === undefined ? '' : hashObject(state),
];

export const checkedStateEquals = <
  A extends CheckedState<any>,
  B extends CheckedState<any>
>(
  a: A,
  b: B
  // They are the same if the instances are the same [0] or if the checksums are the same [1]
) => a[0] === b[0] || a[1] === b[1];
