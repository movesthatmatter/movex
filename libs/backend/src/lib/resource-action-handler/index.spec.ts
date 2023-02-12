import { ResourceShape } from '@matterio/core-util';
import { registerResourceReducer } from './index';

describe('works', () => {
  it('it works', () => {
    type Actions = {
      increment: undefined;
      incrementBy: {
        n: number;
      };
      decrement: undefined;
    };

    const resource: ResourceShape<
      'game',
      {
        counter: number;
      }
    > = {
      type: 'game',
      id: '1',
      item: {
        id: '1',
        counter: 0,
      },
      subscribers: {},
    };

    let actual: typeof resource['item'] = resource.item;

    const dispatch = registerResourceReducer<typeof resource, Actions>(
      resource.item,
      {
        increment: (prev) => {
          return {
            ...prev,
            counter: prev.counter + 1,
          };
        },
        decrement: (prev) => {
          return {
            ...prev,
            counter: prev.counter - 1,
          };
        },
        incrementBy: (prev, { payload }) => {
          return {
            ...prev,
            counter: prev.counter + payload.n,
          };
        },
      },
      (nextState) => {
        actual = nextState;
      }
    );

    // TODO: only enforce the non undefined when there is a payload
    dispatch('increment', undefined);
    expect(actual.counter).toBe(1);

    dispatch('incrementBy', { n: 78 });
    expect(actual.counter).toBe(79);

    dispatch('decrement', undefined);
    dispatch('decrement', undefined);
    expect(actual.counter).toBe(77);
  });
});
