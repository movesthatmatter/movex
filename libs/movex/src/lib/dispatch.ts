import {
  invoke,
  noop,
  checkedStateEquals,
  computeCheckedState,
  isAction,
  isFunction,
  ToPublicAction,
  toMasterActionFromActionOrTuple,
  masterMovexQueries,
  localMovexQueries,
  objectPick,
} from 'movex-core-util';
import type {
  Observable,
  CheckedState,
  ActionOrActionTupleFromAction,
  AnyAction,
  AnyActionTuple,
  MovexReducer,
  MovexMasterQueries,
} from 'movex-core-util';

export type DispatchFn<TAction extends AnyAction = AnyAction> = (
  actionOrActionTupleOrFn:
    | ActionOrActionTupleFromAction<TAction>
    | ((m: {
        $queries: MovexMasterQueries;
      }) => ActionOrActionTupleFromAction<TAction>)
) => void;

export type DispatchedEventPayload<TCheckedState, TAction extends AnyAction> = {
  next: TCheckedState;
  prev: TCheckedState;
  action: ActionOrActionTupleFromAction<TAction>;

  reapplyActionToPrevState: (action: TAction) => TCheckedState;
};

export type DispatchPublicFn<TAction extends AnyAction = AnyAction> = (
  actionOrFn:
    | ToPublicAction<TAction>
    | ((m: { $queries: MovexMasterQueries }) => ToPublicAction<TAction>)
) => void;

const getLocalAction = <TAction extends AnyAction>(
  actionOrActionTuple: ActionOrActionTupleFromAction<TAction>
) =>
  isAction(actionOrActionTuple) ? actionOrActionTuple : actionOrActionTuple[0];

/**
 * Creates the Action Movex Dispatcher
 *
 *
 * @param $checkedState
 * @param reducer
 * @param onEvents
 * @returns
 */
export const createDispatcher = <
  TState = any,
  TAction extends AnyAction = AnyAction
>(
  $checkedState: Observable<CheckedState<TState>>,
  reducer: MovexReducer<TState, TAction>,
  onEvents?: {
    /**
     * This will be called any time an action got dispatched, even if the state didn't update!
     * This is in order to have more control at the client's end. where they can easily check
     *  the checksum's or even instance if there was an update
     *
     * @param event
     * @returns
     */
    onDispatched?: (
      event: DispatchedEventPayload<CheckedState<TState>, TAction>
    ) => void;
    onStateUpdated?: (
      event: Pick<
        DispatchedEventPayload<CheckedState<TState>, TAction>,
        'action' | 'next' | 'prev'
      >
    ) => void;
  }
) => {
  const { onDispatched = noop, onStateUpdated = noop } = onEvents || {};

  let prebatchedActions: (AnyAction | AnyActionTuple)[] = [];
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
    actionOrActionTupleOrFn:
      | ActionOrActionTupleFromAction<TAction>
      | ((m: {
          $queries: MovexMasterQueries;
        }) => ActionOrActionTupleFromAction<TAction>)
  ) => {
    /**
     * Flag to determine if the action is a MasterAction
     *  it gets automatically detected when using the MovexQueries
     */
    let isMasterAction = false as boolean;

    const localActionOrActionTuple = invoke(() => {
      if (isFunction(actionOrActionTupleOrFn)) {
        const localQueries = {
          now: () => {
            // Now it becomes a masterAction
            isMasterAction = true;

            return localMovexQueries.now();
          },
        };

        return actionOrActionTupleOrFn({
          $queries: localQueries,
        });
      }

      return actionOrActionTupleOrFn;
    });

    const localAction = getLocalAction(localActionOrActionTuple);

    if (!initiated) {
      prebatchedActions.push(localActionOrActionTuple);

      return;
    }

    const prevState = currentCheckedState[0];

    const nextCheckedState = computeCheckedState(
      reducer(prevState, localAction)
    );

    const parsedAction =
      isMasterAction && isFunction(actionOrActionTupleOrFn)
        ? toMasterActionFromActionOrTuple(
            actionOrActionTupleOrFn({
              $queries: masterMovexQueries,
            })
          )
        : localActionOrActionTuple;

    const res: DispatchedEventPayload<CheckedState<TState>, TAction> = {
      next: nextCheckedState,
      prev: currentCheckedState,
      action: parsedAction,
      reapplyActionToPrevState: (action) =>
        computeCheckedState(reducer(prevState, action)),
    };

    onDispatched(res);

    if (!checkedStateEquals(currentCheckedState, nextCheckedState)) {
      onStateUpdated(objectPick(res, ['next', 'prev', 'action']));

      // Only if different update them
      $checkedState.update(nextCheckedState);
    }

    return res;
  };

  return { dispatch, unsubscribe: unsubscribeStateUpdates };
};
