import {
  objectKeys,
  type BaseMovexDefinitionResourcesMap,
  type MovexDefinition,
} from 'movex-core-util';
import { MovexMasterResource } from './MovexMasterResource';
import { MovexMasterServer } from './MovexMasterServer';
import type { MovexStore } from '@movex/movex-store';

export const initMovexMaster = <
  TResourcesMap extends BaseMovexDefinitionResourcesMap
>(
  definition: MovexDefinition<TResourcesMap>,
  store: MovexStore<TResourcesMap> // | 'redis' once it's implemented
) => {
  const mapOfResourceReducers = objectKeys(definition.resources).reduce(
    (accum, nextResoureType) => {
      const nextReducer = definition.resources[nextResoureType];

      return {
        ...accum,
        [nextResoureType]: new MovexMasterResource(nextReducer, store),
      };
    },
    {} as Record<string, MovexMasterResource<any, any>>
  );

  return new MovexMasterServer(mapOfResourceReducers);
};
