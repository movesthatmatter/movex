import { tillNextTick } from 'movex-core-util';
import { LocalMovexStore } from './LocalMovexStore';
require('console-group').install();

describe('Concurrency', () => {
  test('Concurrent Updates wait for each other in FIFO order instead of updating at the same time, resulting in the 2nd update to work with stale state', async () => {
    const rid = 'test:1';

    const store = new LocalMovexStore<{ count: number }>({
      [rid]: {
        count: 0,
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
