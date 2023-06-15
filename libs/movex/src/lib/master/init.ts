import { invoke, logsy, objectKeys } from 'movex-core-util';
import { LocalMovexStore, MovexStore } from '../movex-store';
import {
  BaseMovexDefinitionResourcesMap,
  MovexDefinition,
} from '../public-types';
import { MovexMasterResource } from './MovexMasterResource';
import { MovexMasterServer } from './MovexMasterServer';

export const initMovexMaster = <
  TResourcesMap extends BaseMovexDefinitionResourcesMap
>(
  definition: MovexDefinition<TResourcesMap>,
  movexStore: 'memory' | MovexStore<any, any> = 'memory' // | 'redis' once it's implemented
) => {
  const store = invoke(() => {
    if (movexStore === 'memory') {
      const localStore = new LocalMovexStore();

      localStore.onCreated((s) => {
        logsy.group('[Master.LocalStore] onCreated');
        logsy.log('Item', s);
        logsy.log('All Store', localStore.all());
        logsy.groupEnd();
      });

      localStore.onUpdated((s) => {
        logsy.group('[Master.LocalStore] onUpdated');
        logsy.log('Item', s);
        logsy.log('All Store', localStore.all());
        logsy.groupEnd();
      });

      return localStore;
    }

    // TODO: This can be redis well
    return movexStore;
  });

  const mapOfResouceReducers = objectKeys(definition.resources).reduce(
    (accum, nextResoureType) => {
      const nextReducer = definition.resources[nextResoureType];

      return {
        ...accum,
        [nextResoureType]: new MovexMasterResource(nextReducer, store),
      };
    },
    {} as Record<string, MovexMasterResource<any, any>>
  );

  return new MovexMasterServer(mapOfResouceReducers);
};
