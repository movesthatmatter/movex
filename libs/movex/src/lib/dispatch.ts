import {
  invoke,
  noop,
  checkedStateEquals,
  computeCheckedState,
  isAction,
  MovexMasterQueries,
  isFunction,
  ToPublicAction,
  ToCheckedAction,
  toMasterActionFromActionOrTuple,
  ToMasterAction,
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
  Checksum,
} from 'movex-core-util';

export type DispatchFn<TAction extends AnyAction = AnyAction> = (
  actionOrActionTupleOrFn:
    | ActionOrActionTupleFromAction<TAction>
    | ((m: {
        $queries: MovexMasterQueries;
      }) => ActionOrActionTupleFromAction<TAction>)
) => void;

export type DispatchPublicFn<TAction extends AnyAction = AnyAction> = (
  actionOrFn:
    | ToPublicAction<TAction>
    | ((m: { $queries: MovexMasterQueries }) => ToPublicAction<TAction>)
) => void;

// export type DispatchPrivateFn = <TAction extends AnyAction = AnyAction>(
//   actionOrFn:
//     | ToPublicAction<TAction>
//     | ((m: { $queries: MovexMasterQueries }) => ToPublicAction<TAction>)
// ) => void;

export type DispatchedEventPayload<TState, TAction extends AnyAction> = {
  next: TState;
  prev: TState;
  action: ActionOrActionTupleFromAction<TAction>;

  masterAction?: ActionOrActionTupleFromAction<ToMasterAction<TAction>>;
  onEmitMasterActionAck: (
    checkedMasterAction: ToCheckedAction<TAction>
  ) => Checksum;
  // masterAction?: {
  //   // action: ActionOrActionTupleFromAction<TAction>;
  // };
};

// const x = {} as DispatchedEvent<number, AnyAction>;

// if (x.masterAction && isAction(x.masterAction)) {
//   x.masterAction._isMaster === true;
// }

const getLocalAction = <TAction extends AnyAction>(
  actionOrActionTuple: ActionOrActionTupleFromAction<TAction>
) =>
  isAction(actionOrActionTuple) ? actionOrActionTuple : actionOrActionTuple[0];

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
    actionOrActionTupleOrFn:
      | ActionOrActionTupleFromAction<TAction>
      | ((m: {
          $queries: MovexMasterQueries;
        }) => ActionOrActionTupleFromAction<TAction>)
  ) => {
    // Flag to determine if the action is MasterAction
    //  it gets automatically detected when using the MovexQueries
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

    const res: DispatchedEventPayload<CheckedState<TState>, TAction> = {
      next: nextCheckedState,
      prev: currentCheckedState,
      action: localActionOrActionTuple,
      ...(isMasterAction &&
        isFunction(actionOrActionTupleOrFn) && {
          masterAction: toMasterActionFromActionOrTuple(
            actionOrActionTupleOrFn({
              $queries: masterMovexQueries,
            })
          ),
        }),
      onEmitMasterActionAck: (checkedMasterAction) => {
        if (checkedMasterAction.checksum === currentCheckedState[1]) {
          // Do nothing if the current state is the same as the received master checksum
          //  This can happen when the emitted masterAction didn't actualy need to be processed
          return checkedMasterAction.checksum;
        }

        // Recompute the checked state based on the new master action
        const masterFreshState = computeCheckedState(
          reducer(prevState, checkedMasterAction.action)
        );

        // TODO: Should I call onStateUpdated as well?

        if (!checkedStateEquals(currentCheckedState, masterFreshState)) {
          $checkedState.update(masterFreshState);
        }

        return masterFreshState[1];
      },
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
