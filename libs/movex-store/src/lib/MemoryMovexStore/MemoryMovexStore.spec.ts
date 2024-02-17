import { MemoryMovexStore } from './MemoryMovexStore';
import { tillNextTick } from 'movex-specs-util';

describe('CRUD Operations', () => {
  test('create', async () => {
    const store = new MemoryMovexStore<{
      counter: () => { count: number };
      tester: () => { val: string };
    }>();

    await store
      .create('counter:9', {
        count: 9,
      })
      .resolveUnwrap();

    await store
      .create('tester:1', {
        val: 'aha',
      })
      .map((s) => {
        s.state[0].val;
      })
      .resolveUnwrap();

    const expectedTester = await store.get('tester:1').resolveUnwrap();

    const expectedCounter = await store.get('counter:9').resolveUnwrap();

    expect(expectedCounter.state[0].count).toBe(9);
    expect(expectedTester.state[0].val).toBe('aha');
  });

  test('delete', async () => {
    const store = new MemoryMovexStore<{
      counter: () => { count: number };
    }>();

    await store
      .create('counter:15', {
        count: 15,
      })
      .resolveUnwrap();

    await store
      .create('counter:1', {
        count: 1,
      })
      .resolveUnwrap();

    store.updateState('counter:1', (prev) => ({
      ...prev,
      count: prev.count + 9,
    }));

    const expectedCounter = await store.get('counter:1').resolveUnwrap();
    expect(expectedCounter.state[0].count).toBe(10);

    store.remove('counter:15');

    const expectedStore = await store.all();
    expect(expectedStore.counter?.['counter:15']).toBeUndefined();
    expect(expectedStore.counter?.['counter:1']).toBeDefined();
  });
});

describe('Multiple Resource Types', () => {
  test('it works with multiple resource types', async () => {
    const store = new MemoryMovexStore<{
      counter: () => { count: number };
      test: () => { val: number };
    }>({
      counter: {
        ['counter:0']: {
          count: 0,
        },
        ['counter:20']: {
          count: 20,
        },
      },
      test: {
        ['test:1']: {
          val: 1,
        },
      },
    });

    store.updateState('counter:0', (prev) => ({
      ...prev,
      count: prev.count + 1,
    }));

    store.updateState('counter:0', (prev) => ({
      ...prev,
      count: prev.count + 20,
    }));

    await tillNextTick();

    const actual = await store.get<'counter'>('counter:0').resolveUnwrap();

    expect(actual.state[0].count).toBe(21);
  });
});

describe('Concurrency', () => {
  test('Concurrent Updates wait for each other in FIFO order instead of updating at the same time, resulting in the 2nd update to work with stale state', async () => {
    const rid = 'counter:1';

    const store = new MemoryMovexStore<{ counter: () => { count: number } }>({
      counter: {
        [rid]: {
          count: 0,
        },
      },
    });

    store.updateState(rid, (prev) => ({
      ...prev,
      count: prev.count + 1,
    }));

    store.updateState(rid, (prev) => ({
      ...prev,
      count: prev.count + 20,
    }));

    await tillNextTick();

    const actual = await store.get(rid).resolveUnwrap();

    expect(actual.state[0].count).toBe(21);
  });
});

describe('clearAll functionality', () => {
  test('clearAll with an empty store', async () => {
    const store = new MemoryMovexStore<{ counter: () => { count: number } }>();
    await store.clearAll().resolve();

    expect(store.all()).toEqual({});
  });

  test('newly created items are not there after clearAll', async () => {
    const store = new MemoryMovexStore<{ counter: () => { count: number } }>();

    await store.create('counter:1', { count: 1 }).resolve();
    await store.clearAll().resolve();

    expect(store.all()).toEqual({});
  });

  test('clearAll after items are updated', async () => {
    const store = new MemoryMovexStore<{ counter: () => { count: number } }>();

    await store.create('counter:1', { count: 1 }).resolve();
    await store
      .updateState('counter:1', (prev) => ({ count: prev.count + 1 }))
      .resolve();
    await store.clearAll().resolve();

    expect(store.all()).toEqual({});
  });

  test('clearAll after items are removed', async () => {
    const store = new MemoryMovexStore<{ counter: () => { count: number } }>();

    await store.create('counter:1', { count: 1 }).resolve();
    await store.remove('counter:1').resolve();
    await store.clearAll().resolve();

    expect(store.all()).toEqual({});
  });

  test('clearAll after multiple operations', async () => {
    const store = new MemoryMovexStore<{ counter: () => { count: number } }>();

    await store.create('counter:1', { count: 1 }).resolve();
    await store
      .updateState('counter:1', (prev) => ({ count: prev.count + 1 }))
      .resolve();
    await store.remove('counter:1').resolve();
    await store.create('counter:2', { count: 2 }).resolve();
    await store.clearAll().resolve();

    expect(store.all()).toEqual({});
  });
});
