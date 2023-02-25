import { invoke, noop, Observable, StringKeys } from 'movex-core-util';
import { CheckedState, MovexState } from '../core-types';
import { checkedStateEquals, computeCheckedState } from '../util';
import {
  Action,
  ActionOrActionTuple,
  ActionsCollectionMapBase,
  AnyActionOrActionTupleOf,
  GenericPrivateAction,
  GenericPublicAction,
  isAction,
  PrivateAction,
  PublicAction,
} from './action';
import { MovexReducerMap } from './reducer';

export type DispatchFn = <
  TActionType extends StringKeys<ActionCollectionMap>,
  ActionCollectionMap extends ActionsCollectionMapBase
>(
  actionOrActionTuple:
    | PublicAction<TActionType, ActionCollectionMap[TActionType]>
    | [
        PrivateAction<TActionType, ActionCollectionMap[TActionType]>,
        PublicAction<TActionType, ActionCollectionMap[TActionType]>
      ]
) => void;

export type DispatchedEvent<
  TState,
  ActionMap extends ActionsCollectionMapBase
> = {
  next: TState;
  prev: TState;
  action: AnyActionOrActionTupleOf<ActionMap>;
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
