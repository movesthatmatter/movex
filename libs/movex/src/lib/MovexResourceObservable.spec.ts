import { Ok } from 'ts-results';
import { MovexResourceObservable } from './MovexResourceObservable';
import {
  globalLogsy,
  ResourceIdentifier,
  computeCheckedState,
} from 'movex-core-util';
import {
  tillNextTick,
  counterReducer,
  initialCounterState,
} from 'movex-specs-util';

const rid: ResourceIdentifier<string> = 'counter:test-id';

test('Dispatch Local Actions', async () => {
  const $resource = new MovexResourceObservable(
    'test-client',
    rid,
    counterReducer
  );
  $resource.setMasterSyncing(false);

  $resource.dispatch({
    type: 'increment',
  });

  await tillNextTick();

  expect($resource.getUncheckedState()).toEqual({ count: 1 });

  $resource.onUpdate((next) => {
    expect(next.checkedState).toEqual(
      computeCheckedState({
        count: 4,
      })
    );
  });

  $resource.dispatch({
    type: 'incrementBy',
    payload: 3,
  });

  await tillNextTick();

  expect($resource.getUncheckedState()).toEqual({ count: 4 });
});

describe('External Updates', () => {
  test('updates the unchecked state', async () => {
    const $resource = new MovexResourceObservable(
      'test-client',
      rid,
      counterReducer
    );
    $resource.setMasterSyncing(false);

    $resource.dispatch({
      type: 'increment',
    });

    await tillNextTick();

    expect($resource.getUncheckedState()).toEqual({ count: 1 });

    $resource.updateUncheckedState({
      count: 40,
    });

    expect($resource.getUncheckedState()).toEqual({ count: 40 });

    $resource.dispatch({
      type: 'decrement',
    });

    await tillNextTick();

    expect($resource.getUncheckedState()).toEqual({ count: 39 });
  });

  describe('Reconciliate Action', () => {
    test('Updates when matching', () => {
      const $resource = new MovexResourceObservable(
        'test-client',
        rid,
        counterReducer
      );

      const updateSpy = jest.fn();
      $resource.onUpdate(updateSpy);

      const [incrementedState, incrementedStateChecksum] = computeCheckedState({
        ...initialCounterState,
        count: initialCounterState.count + 1,
      });

      const actual = $resource.reconciliateAction({
        action: {
          type: 'increment',
        },
        checksum: incrementedStateChecksum,
      });

      expect(actual).toEqual(
        new Ok([incrementedState, incrementedStateChecksum])
      );

      expect(updateSpy).toHaveBeenCalledWith({
        subscribers: {},
        checkedState: [incrementedState, incrementedStateChecksum],
      });
    });

    test('Fails when NOT matching and does not update', () => {
      const $resource = new MovexResourceObservable(
        'test-client',
        rid,
        counterReducer
      );

      const updateSpy = jest.fn();
      $resource.onUpdate(updateSpy);

      const actual = $resource.reconciliateAction({
        action: {
          type: 'increment',
        },
        checksum: 'wrong_checksum',
      });

      expect(actual.val).toEqual('ChecksumMismatch');
    });
  });

  test('Destroys the observable', async () => {
    const $resource = new MovexResourceObservable(
      'test-client',
      rid,
      counterReducer
    );
    $resource.setMasterSyncing(false);
    const updateListener = jest.fn();
    $resource.onUpdate(updateListener);

    expect(updateListener).not.toHaveBeenCalled();

    $resource.destroy();

    await tillNextTick();

    $resource.dispatch({
      type: 'increment',
    });

    expect(updateListener).not.toHaveBeenCalled();
  });
});

// TODO: Add some tests with the subscibers
