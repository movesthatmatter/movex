import { Ok } from 'ts-results';
import { computeCheckedState } from '../lib/util';
import counterReducer, {
  initialCounterState,
} from './resources/counterReducer';
import { MovexResourceObservable } from '../lib/client/MovexResourceObservable';
import { globalLogsy, ResourceIdentifier } from 'movex-core-util';
import { tillNextTick } from './util/misc';

const rid: ResourceIdentifier<string> = 'counter:test-id';

beforeAll(() => {
  globalLogsy.disable();
});

afterAll(() => {
  globalLogsy.enable();
});

describe('Observable', () => {
  test('Dispatch Local Actions', async () => {
    const xResource = new MovexResourceObservable(
      'test-client',
      rid,
      counterReducer
    );
    xResource.setMasterSyncing(false);

    xResource.dispatch({
      type: 'increment',
    });

    await tillNextTick();

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

    await tillNextTick();

    expect(xResource.getUncheckedState()).toEqual({ count: 4 });
  });

  describe('External Updates', () => {
    test('updates the unchecked state', async () => {
      const xResource = new MovexResourceObservable(
        'test-client',
        rid,
        counterReducer
      );
      xResource.setMasterSyncing(false);

      xResource.dispatch({
        type: 'increment',
      });

      await tillNextTick();

      expect(xResource.getUncheckedState()).toEqual({ count: 1 });

      xResource.updateUncheckedState({
        count: 40,
      });

      expect(xResource.getUncheckedState()).toEqual({ count: 40 });

      xResource.dispatch({
        type: 'decrement',
      });

      await tillNextTick();

      expect(xResource.getUncheckedState()).toEqual({ count: 39 });
    });

    describe('Reconciliate Action', () => {
      test('Updates when matching', () => {
        const xResource = new MovexResourceObservable(
          'test-client',
          rid,
          counterReducer
        );

        const updateSpy = jest.fn();
        xResource.onUpdated(updateSpy);

        const [incrementedState, incrementedStateChecksum] =
          computeCheckedState({
            ...initialCounterState,
            count: initialCounterState.count + 1,
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
        const xResource = new MovexResourceObservable(
          'test-client',
          rid,
          counterReducer
        );

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
     
      test('Destroys the observable', async () => {
        const xResource = new MovexResourceObservable(
          'test-client',
          rid,
          counterReducer
        );
        xResource.setMasterSyncing(false);
        const updateListener = jest.fn();
        xResource.onUpdated(updateListener);

        expect(updateListener).not.toHaveBeenCalled();

        xResource.destroy();

        await tillNextTick();

        xResource.dispatch({
          type: 'increment',
        });
        
        expect(updateListener).not.toHaveBeenCalled();
      });
  });
});
