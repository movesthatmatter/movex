import { toResourceIdentifierStr } from 'movex-core-util';
import { LocalMovexStore } from '../lib/store';
import { GetReducerState } from '../lib/tools/reducer';
import { computeCheckedState } from '../lib/util';
import counterReducer, {
  CounterState,
  initialCounterState,
} from './util/counterReducer';
import { createMasterEnv } from './util/createMasterEnv';

const rid = toResourceIdentifierStr({
  resourceType: 'counter',
  resourceId: 'test',
});

const localStore = new LocalMovexStore<
  GetReducerState<typeof counterReducer>
>();

beforeEach(async () => {
  await localStore.clearAll().resolveUnwrap();

  await localStore.create(rid, initialCounterState).resolveUnwrap();
});

test('gets an ack checksum after action emited', async () => {
  const masterEnv = createMasterEnv({
    store: localStore,
    reducer: counterReducer,
    clientCountOrIdsAsString: ['a', 'b', 'c'],
    rid,
  });

  const [a] = masterEnv.clients;

  const initialCheckedState = await masterEnv.getPublic().resolveUnwrap();

  expect(initialCheckedState).toEqual(computeCheckedState(initialCounterState));

  const actualChecksum = await a
    .emitAction({
      type: 'change',
      payload: 2,
    })
    .resolveUnwrap();

  expect(actualChecksum).toBeDefined();
  expect(actualChecksum).not.toEqual(initialCheckedState[1]);
});

test('the peers get the action forwarded', async () => {
  const masterEnv = createMasterEnv({
    store: localStore,
    reducer: counterReducer,
    clientCountOrIdsAsString: ['a', 'b', 'c'],
    rid,
  });

  const [a, b, c] = masterEnv.clients;

  const aSpy = jest.fn();
  const bSpy = jest.fn();
  const cSpy = jest.fn();

  a.onFwdAction(aSpy);
  b.onFwdAction(bSpy);
  c.onFwdAction(cSpy);

  const actualChecksum = await a
    .emitAction({
      type: 'change',
      payload: 2,
    })
    .resolveUnwrap();

  expect(bSpy).toHaveBeenCalledWith({
    action: {
      type: 'change',
      payload: 2,
    },
    checksum: actualChecksum,
  });

  expect(cSpy).toHaveBeenCalledWith({
    action: {
      type: 'change',
      payload: 2,
    },
    checksum: actualChecksum,
  });

  expect(aSpy).not.toHaveBeenCalled();
});

test('the peers get the state updated', async () => {
  const masterEnv = createMasterEnv({
    store: localStore,
    reducer: counterReducer,
    clientCountOrIdsAsString: ['a', 'b', 'c'],
    rid,
  });

  const [a, b, c] = masterEnv.clients;

  const aSpy = jest.fn();
  const bSpy = jest.fn();
  const cSpy = jest.fn();

  a.subscribeToNetworkExpensiveMasterUpdates(aSpy);
  b.subscribeToNetworkExpensiveMasterUpdates(bSpy);
  c.subscribeToNetworkExpensiveMasterUpdates(cSpy);

  const actualChecksum = await a
    .emitAction({
      type: 'change',
      payload: 2,
    })
    .resolveUnwrap();

  const expectedState: CounterState = {
    ...initialCounterState,
    count: 2,
  };

  const expected = computeCheckedState(expectedState);

  expect(actualChecksum).toBe(expected[1]);

  expect(bSpy).toHaveBeenCalledWith(expected);
  expect(cSpy).toHaveBeenCalledWith(expected);
  expect(aSpy).not.toHaveBeenCalled();
});
