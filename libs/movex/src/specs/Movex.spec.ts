import { createMovexInstance } from '../lib';
import { Action } from '../lib/types';
import { createMovexReducerMap } from '../lib/util';

type ActionsMap = {
  increment: undefined;
  decrement: undefined;
  incrementBy: number;
};

type State = {
  count: number;
};

const initialState: State = {
  count: 0,
};

const reducer = createMovexReducerMap<ActionsMap, State>(initialState)({
  increment: (prev) => ({
    ...prev,
    count: prev.count + 1,
  }),
  decrement: (prev) => ({
    ...prev,
    count: prev.count - 1,
  }),
  incrementBy: (prev, { payload }) => ({
    ...prev,
    count: prev.count + payload,
  }),
});

type ResourceCollectionMap = {};

test('works', () => {
  const instance = createMovexInstance(
    {
      url: 'n/a',
      apiKey: 'n/a',
    },
    [
      {
        type: 'counter',
        defaultState: {
          count: 1,
        },
        // actionsMap: reducer,
        reducer: {
          increment: (state, action: Action<'increment', { n: number }>) => {
            return state;
          },
        },
      },
    ]
  );

  // to be used
  instance.resources.counter.get(); // TODO: counter is any
});
