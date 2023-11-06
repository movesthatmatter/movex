import {
  invoke,
  noop,
  checkedStateEquals,
  computeCheckedState,
  isAction,
} from 'movex-core-util';
import type {
  Observable,
  CheckedState,
  ActionOrActionTupleFromAction,
  AnyAction,
  AnyActionOrActionTuple,
  AnyActionTuple,
  MovexReducer,
} from 'movex-core-util';

export type DispatchFn = (actionOrActionTuple: AnyActionOrActionTuple) => void;

export type DispatchedEvent<TState, TAction extends AnyAction> = {
  next: TState;
  prev: TState;
  action: ActionOrActionTupleFromAction<TAction>;
};

// Here - it needs to handle the private action one as well
// NEXT - Implement this on the backend and check public/private
// Next Next - implement in on maha and change the whole game strategy to this
export const createDispatcher = <
  TState = any,
  TAction extends AnyAction = AnyAction
>(
  $checkedState: Observable<CheckedState<TState>>,
  reducer: MovexReducer<TState, TAction>,
  onEvents?: {
    // This will be called any time an action got dispatched
    // Even if the state didn't update!
    // This is in order to have more control at the client's end. where they can easily check the checksum's or even instance
    //  if there was any update
    onDispatched?: (
      event: DispatchedEvent<CheckedState<TState>, TAction>
    ) => void;
    onStateUpdated?: (
      event: DispatchedEvent<CheckedState<TState>, TAction>
    ) => void;
  }
) => {
  const { onDispatched = noop, onStateUpdated = noop } = onEvents || {};

  // the actions that were batched before the initial state had a chance to resolve
  let prebatchedActions: (AnyAction | AnyActionTuple)[] = [];

  // let currentStateAndChecksum: StateAndChecksum<TResource['item']>;
  let currentCheckedState: CheckedState<TState>;

  let initiated = false;

  const onStateReceived = (checkedState: CheckedState<TState>) => {
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

  const dispatch = (
    actionOrActionTuple: ActionOrActionTupleFromAction<TAction>
  ) => {
    const [localAction] = invoke(() => {
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
      reducer(currentCheckedState[0], localAction as TAction)
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

      $checkedState.update(nextCheckedState);

      // Only if different update them
      // currentCheckedState = nextCheckedState;
    }
  };

  return { dispatch, unsubscribe: unsubscribeStateUpdates };
};
