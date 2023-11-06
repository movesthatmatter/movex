import { Action } from  'movex-core-util';

export type CounterState = {
  count: number;
};

export const initialCounterState: CounterState = {
  count: 0,
};

export type CounterActions =
  | Action<'increment'>
  | Action<'decrement'>
  | Action<'change', number>
  | Action<'incrementBy', number>;

export const counterReducer = (
  state = initialCounterState,
  action: CounterActions
) => {
  if (action.type === 'increment') {
    return {
      ...state,
      count: state.count + 1,
    };
  }

  if (action.type === 'decrement') {
    return {
      ...state,
      count: state.count - 1,
    };
  }

  if (action.type === 'incrementBy') {
    return {
      ...state,
      count: state.count + action.payload,
    };
  }

  if (action.type === 'change') {
    return {
      ...state,
      count: action.payload,
    };
  }

  return state;
};

export default counterReducer;
