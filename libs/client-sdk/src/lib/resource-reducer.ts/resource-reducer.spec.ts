// import { backend } from './backend';

import {
  ClientResource,
  ClientResourceShape,
  delay,
  GenericClientResourceShapeOfType,
  toResourceIdentifierObj,
  toResourceIdentifierStr,
} from '@matterio/core-util';
import { ClientSdk } from '../client-sdk';
import { getResourceRId } from '@matterio/core-util';
import { createResourceReducerMap, dispatchFactory } from './resource-reducer';

type ActionsMap = {
  increment: undefined;
  incrementBy: number;
};

type GameState = { status: 'test'; counter: number };

type GameResource = ClientResourceShape<'game', GameState>;

describe('Resource Reducer', () => {
  it('works', async () => {
    const gameResource: GameResource = {
      type: 'game',
      id: '1',
      item: {
        id: '1',
        status: 'test',
        counter: 0,
      },
    };

    const reducerMap = createResourceReducerMap<GameResource, ActionsMap>({
      increment: (prev) => {
        return {
          ...prev,
          counter: prev.counter + 1,
        };
      },
    });

    let actual: GameResource['item'] | undefined = undefined;

    // TODO I would like to be able not to pass in the generics again, but tohe able to infer them!
    const dispatch = dispatchFactory<GameResource, ActionsMap>(
      delay(100).then(() => gameResource),
      reducerMap,
      (nextState) => {
        actual = nextState;
      }
    );

    dispatch('increment', undefined);

    await delay(101);

    expect(actual).toEqual({
      ...gameResource.item,
      counter: 1,
    });

    dispatch('increment', undefined);
    dispatch('increment', undefined);

    expect(actual).toEqual({
      ...gameResource.item,
      counter: 3,
    });
  });
});
