import { createMovexInstance } from '../lib';
import { createActionCreator } from '../lib/tools/action';
import { createResourceFile } from '../lib/tools/resourceFile';

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

// const reducer = createMovexReducerMap<ActionsMap, State>(initialState)({
//   increment: (prev) => ({
//     ...prev,
//     count: prev.count + 1,
//   }),
//   decrement: (prev) => ({
//     ...prev,
//     count: prev.count - 1,
//   }),
//   incrementBy: (prev, { payload }) => ({
//     ...prev,
//     count: prev.count + payload,
//   }),
// });

type ResourceCollectionMap = {};

test('works', () => {
  const counter = createResourceFile(
    'counter',
    {
      count: 0,
    },
    {
      increment2: createActionCreator(
        'increment',
        (resolve) => (p: number) => resolve(p)
      ),
    }
    // actionsMap: reducer,
    // {
    //   // incrementasda: (state, action) => {
    //   //   return state;
    //   // },
    //   // incre
    // },
    // $canPublicizePrivateState: () => {
    //   return true;
    // },
  )({
    increment2: (state, action) => {
      return state;
    },
  });

  const instance = createMovexInstance(
    {
      url: 'n/a',
      apiKey: 'n/a',
    },
    {
      counter,
      // counter: ,
    }
  );

  // instance.resources.

  // to be used
  // instance.resources.counter.get(); // TODO: counter is any
});
