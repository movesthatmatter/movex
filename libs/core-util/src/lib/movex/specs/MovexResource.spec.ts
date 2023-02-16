import { MovexResource } from '../MovexResource';
import { computeCheckedState, createMovexReducerMap } from '../util';

describe('Observable', () => {
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

  test('simple actions with only dispatched updates', () => {
    // TODO: Ideally only by getting the reducer we know the state
    const xResource = new MovexResource<State, ActionsMap>(
      reducer,
      computeCheckedState(initialState)
    );

    xResource.dispatch({
      type: 'increment',
      payload: undefined,
    });

    expect(xResource.getUncheckedState()).toEqual({ count: 1 });

    xResource.dispatch({
      type: 'incrementBy',
      payload: 3,
    });

    expect(xResource.getUncheckedState()).toEqual({ count: 4 });
  });

  describe('External Updates', () => {
    test('updates the unchecked state', () => {
      // TODO: Ideally only by getting the reducer we know the state
      const xResource = new MovexResource<State, ActionsMap>(
        reducer,
        computeCheckedState(initialState)
      );

      xResource.dispatch({
        type: 'increment',
        payload: undefined,
      });

      expect(xResource.getUncheckedState()).toEqual({ count: 1 });

      xResource.updateUncheckedState({
        count: 40,
      });

      expect(xResource.getUncheckedState()).toEqual({ count: 40 });

      xResource.dispatch({
        type: 'decrement',
        payload: undefined,
      });

      expect(xResource.getUncheckedState()).toEqual({ count: 39 });
    });
  });

  describe('multiple resoure orchestration', () => {
    const xResource = new MovexResource<State, ActionsMap>(
      reducer,
      computeCheckedState(initialState)
    );

    xResource
  });

  // TODO: test xresource destroy which unsubscribes
});
