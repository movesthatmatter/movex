import { Ok } from 'ts-results';
import { MovexResource } from '../lib/MovexResource';
import { computeCheckedState, createMovexReducerMap } from '../lib/util';

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

  test('Dispatch Local Actions', () => {
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

    xResource.onUpdated((nextCheckedState) => {
      expect(nextCheckedState).toEqual(
        computeCheckedState({
          count: 4,
        })
      );
    });

    xResource.dispatch({
      type: 'incrementBy',
      payload: 3,
    });

    expect(xResource.getUncheckedState()).toEqual({ count: 4 });
  });

  test('Apply Local Actions', () => {
    const xResource = new MovexResource<State, ActionsMap>(
      reducer,
      computeCheckedState(initialState)
    );

    xResource.applyAction({
      type: 'increment',
      payload: undefined,
    });

    expect(xResource.getUncheckedState()).toEqual({ count: 1 });

    xResource.onUpdated((nextCheckedState) => {
      expect(nextCheckedState).toEqual(
        computeCheckedState({
          count: 4,
        })
      );
    });

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

    describe('Reconciliate Action', () => {
      test('Updates when matching', () => {
        const xResource = new MovexResource<State, ActionsMap>(
          reducer,
          computeCheckedState(initialState)
        );

        const updateSpy = jest.fn();
        xResource.onUpdated(updateSpy);

        const [incrementedState, incrementedStateChecksum] =
          computeCheckedState({
            ...initialState,
            count: initialState.count + 1,
          });

        const actual = xResource.reconciliateAction({
          action: {
            type: 'increment',
            payload: undefined,
          },
          checksum: incrementedStateChecksum,
        });

        expect(actual).toEqual(
          new Ok([incrementedState, incrementedStateChecksum])
        );

        expect(updateSpy).toHaveBeenCalledWith([
          incrementedState,
          incrementedStateChecksum,
        ]);
      });

      test('Fails when NOT matching and does not update', () => {
        const xResource = new MovexResource<State, ActionsMap>(
          reducer,
          computeCheckedState(initialState)
        );

        const updateSpy = jest.fn();
        xResource.onUpdated(updateSpy);

        const actual = xResource.reconciliateAction({
          action: {
            type: 'increment',
            payload: undefined,
          },
          checksum: 'wrong_checksum',
        });

        expect(actual.val).toEqual('ChecksumMismatch');
      });
    });
  });

  // TODO: test xresource destroy which unsubscribes
});
