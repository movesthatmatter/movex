import {
  counterReducer,
  initialCounterState,
  CounterState,
} from 'movex-specs-util';
import {
  computeCheckedState,
  MovexMasterContext,
  toResourceIdentifierStr,
} from 'movex-core-util';
import { MovexMasterResource } from './MovexMasterResource';
import { MemoryMovexStore } from 'movex-store';
import MockDate from 'mockdate';
import { createMasterContext } from './util';

const rid = toResourceIdentifierStr({ resourceType: 'c', resourceId: '1' });

test('gets initial state transformed', async () => {
  (counterReducer as any).$transformState = (): CounterState => {
    return { count: -99 };
  };

  const master = new MovexMasterResource(
    counterReducer,
    new MemoryMovexStore({
      match: {
        [rid]: initialCounterState,
      },
    })
  );

  const mockMasterContext = createMasterContext({ requestAt: 123 });

  const actualPublic = await master.getPublicState(rid, mockMasterContext).resolveUnwrap();
  const actualClientSpecific = await master
    .getClientSpecificState(rid, 'testClient', mockMasterContext)
    .resolveUnwrap();

  const expected = computeCheckedState({ count: -99 });

  expect(actualPublic).toEqual(expected);
  expect(actualClientSpecific).toEqual(expected);
});

test('gets initial state transformed with Prev State', async () => {
  const prevCounterState: CounterState = {
    count: -99,
  };

  (counterReducer as any).$transformState = (
    prev: CounterState
  ): CounterState => {
    return { count: prev.count - 5 };
  };

  const master = new MovexMasterResource(
    counterReducer,
    new MemoryMovexStore({
      match: {
        [rid]: prevCounterState,
      },
    })
  );

  const mockMasterContext = createMasterContext({ requestAt: 123 });

  const actualPublic = await master
    .getPublicState(rid, mockMasterContext)
    .resolveUnwrap();
  const actualClientSpecific = await master
    .getClientSpecificState(rid, 'testClient', mockMasterContext)
    .resolveUnwrap();

  const expected = computeCheckedState({ count: -104 });

  expect(actualPublic).toEqual(expected);
  expect(actualClientSpecific).toEqual(expected);
});

test('gets initial state transformed with PrevState and Movex Context', async () => {
  const MOCKED_NOW = 3;
  MockDate.set(new Date(MOCKED_NOW));

  (counterReducer as any).$transformState = (
    prev: CounterState,
    context: MovexMasterContext
  ): CounterState => {
    return { count: context.requestAt };
  };

  const master = new MovexMasterResource(
    counterReducer,
    new MemoryMovexStore({
      match: {
        [rid]: initialCounterState,
      },
    })
  );

  const mockMasterContext = createMasterContext({ requestAt: 123 });

  const actualPublic = await master
    .getPublicState(rid, mockMasterContext)
    .resolveUnwrap();
  const actualClientSpecific = await master
    .getClientSpecificState(rid, 'testClient', mockMasterContext)
    .resolveUnwrap();

  MockDate.reset();

  const expected = computeCheckedState({ count: 123 });

  expect(actualPublic).toEqual(expected);
  expect(actualClientSpecific).toEqual(expected);
});
