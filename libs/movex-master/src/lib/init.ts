import {
  globalLogsy,
  objectKeys,
  type BaseMovexDefinitionResourcesMap,
  type MovexDefinition,
} from 'movex-core-util';
import { MovexMasterResource } from './MovexMasterResource';
import { MovexMasterServer } from './MovexMasterServer';
import type { MovexStore } from 'movex-store';
const pkgVersion = require('../../package.json').version;

export const initMovexMaster = <
  TResourcesMap extends BaseMovexDefinitionResourcesMap
>(
  definition: MovexDefinition<TResourcesMap>,
  store: MovexStore<TResourcesMap> // | 'redis' once it's implemented
) => {
  // Run this only if in node!
  // if (process?.env) {

  console.info(`[MovexMaster] v${pkgVersion || 'Client-version'} initiating...`);

  // }

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
