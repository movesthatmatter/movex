import { Ok } from 'ts-results';
import { MovexResourceObservable } from './MovexResourceObservable';
import { ResourceIdentifier, computeCheckedState, UnknownRecord, MovexMasterContext } from 'movex-core-util';
import {
  tillNextTick,
  counterReducer,
  initialCounterState,
} from 'movex-specs-util';
import MockDate from 'mockdate';

// This needs to be rewritten here in order to not have a circular dependency (since it comes from movex-master)!
export const createMasterContext = (p?: {
  requestAt?: number;
  extra?: UnknownRecord;
}): MovexMasterContext => ({
  // @Deprecate in favor of requestAt Props which enables purity
  now: () => new Date().getTime(),

  requestAt: p?.requestAt || new Date().getTime(),

  ...(p?.extra && { _extra: p?.extra }),
});

const rid: ResourceIdentifier<string> = 'counter:test-id';

describe('Dispatch', () => {
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

    expect($resource.getUnwrappedState()).toEqual({ count: 1 });

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

    expect($resource.getUnwrappedState()).toEqual({ count: 4 });
  });

  test('Dispatch Local Actions via the callback method', async () => {
    const $resource = new MovexResourceObservable(
      'test-client',
      rid,
      counterReducer
    );
    $resource.setMasterSyncing(false);

    $resource.dispatch(() => ({
      type: 'increment',
    }));

    await tillNextTick();

    expect($resource.getUnwrappedState()).toEqual({ count: 1 });

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

    expect($resource.getUnwrappedState()).toEqual({ count: 4 });
  });
});

describe('Reconciliate Actions', () => {
  test('Updates when matching', () => {
    const $resource = new MovexResourceObservable(
      'test-client',
      rid,
      counterReducer
    );

    const mockMasterContext = createMasterContext({ requestAt: 123 });

    const updateSpy = jest.fn();
    $resource.onUpdate(updateSpy);

    const [incrementedState, incrementedStateChecksum] = computeCheckedState({
      ...initialCounterState,
      count: initialCounterState.count + 1,
    });

    const actual = $resource.reconciliateAction(
      {
        action: {
          type: 'increment',
        },
        checksum: incrementedStateChecksum,
      },
      mockMasterContext
    );

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

    const mockMasterContext = createMasterContext({ requestAt: 123 });

    const updateSpy = jest.fn();
    $resource.onUpdate(updateSpy);

    const actual = $resource.reconciliateAction(
      {
        action: {
          type: 'increment',
        },
        checksum: 'wrong_checksum',
      },
      mockMasterContext
    );

    expect(actual.val).toEqual('ChecksumMismatch');
  });
});

describe('Master Actions (applied locally only)', () => {
  test('tests a master action local application', async () => {
    const $resource = new MovexResourceObservable(
      'test-client',
      rid,
      counterReducer
    );
    $resource.setMasterSyncing(false);

    const MOCKED_NOW = 33;
    MockDate.set(new Date(MOCKED_NOW));

    $resource.dispatch((movex) => ({
      type: 'incrementBy',
      payload: movex.$queries.now(),
    }));

    await tillNextTick();

    expect($resource.getUnwrappedState()).toEqual({ count: MOCKED_NOW });
  });
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

    expect($resource.getUnwrappedState()).toEqual({ count: 1 });

    $resource.updateUnwrappedState({
      count: 40,
    });

    expect($resource.getUnwrappedState()).toEqual({ count: 40 });

    $resource.dispatch({
      type: 'decrement',
    });

    await tillNextTick();

    expect($resource.getUnwrappedState()).toEqual({ count: 39 });
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

// TODO: Add some tests with the subscibers
