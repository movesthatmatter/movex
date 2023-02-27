import { Ok } from 'ts-results';
import { MovexResource } from '../lib/MovexResource';
import { Action } from '../lib/tools/action';
import { computeCheckedState } from '../lib/util';

describe('Observable', () => {
  type State = {
    count: number;
  };

  const initialState: State = {
    count: 0,
  };

  const reducer = (
    prev = initialState,
    action:
      | Action<'increment'>
      | Action<'decrement'>
      | Action<'incrementBy', number>
  ) => {
    if (action.type === 'increment') {
      return {
        ...prev,
        count: prev.count + 1,
      };
    }

    if (action.type === 'decrement') {
      return {
        ...prev,
        count: prev.count - 1,
      };
    }

    if (action.type == 'incrementBy') {
      return {
        ...prev,
        count: prev.count + action.payload,
      };
    }

    return prev;
  };

  test('Dispatch Local Actions', () => {
    // TODO: Ideally only by getting the reducer we know the state
    const xResource = new MovexResource(reducer);

    xResource.dispatch({
      type: 'increment',
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
    const xResource = new MovexResource(reducer);

    xResource.applyAction({
      type: 'increment',
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
      const xResource = new MovexResource(reducer);

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
        const xResource = new MovexResource(reducer);

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
        const xResource = new MovexResource(reducer);

        const updateSpy = jest.fn();
        xResource.onUpdated(updateSpy);

        const actual = xResource.reconciliateAction({
          action: {
            type: 'increment',
          },
          checksum: 'wrong_checksum',
        });

        expect(actual.val).toEqual('ChecksumMismatch');
      });
    });
  });

  // TODO: test xresource destroy which unsubscribes
});
