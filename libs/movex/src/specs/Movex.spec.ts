import { createMovexInstance } from '../lib';
import { Action } from '../lib/tools/action';
import { computeCheckedState } from '../lib/util';

type State = {
  count: number;
};

const initialState: State = {
  count: 0,
};

type CounterActions =
  | Action<'increment'>
  | Action<'change', number>
  | Action<'incrementBy', number>;

test('Initial State', () => {
  const counterReducer = (state = initialState, action: CounterActions) => {
    if (action.type === 'increment') {
      return {
        ...state,
        count: state.count + 1,
      };
    }

    return state;
  };

  const instance = createMovexInstance({
    url: 'n/a',
    apiKey: 'n/a',
  });

  const resource = instance.registerResource('counter', counterReducer);

  const expected = computeCheckedState({
    count: 0,
  });

  expect(resource.get()).toEqual(expected);
});

// TODO: Add more tests