import { Action } from 'movex-core-util';

export type CounterMovexState = {
  value: number;
};

export const initialCounterMovexState: CounterMovexState = {
  value: 0,
};

type IncrementAction = Action<'increment'>;
type DecrementAction = Action<'decrement'>;
type Add = Action<'add', number>;
type Substract = Action<'substract', number>;

export type CounterMovexActions =
  | IncrementAction
  | DecrementAction
  | Add
  | Substract;

export default (
  state = initialCounterMovexState,
  action: CounterMovexActions
) => {
  if (action.type === 'increment') {
    return {
      ...state,
      value: state.value + 1,
    };
  }

  if (action.type === 'decrement') {
    return {
      ...state,
      value: state.value - 1,
    };
  }

  if (action.type === 'add') {
    return {
      ...state,
      value: state.value + action.payload,
    };
  }

  if (action.type === 'substract') {
    return {
      ...state,
      value: state.value - action.payload,
    };
  }

  return state;
};
