import { objectKeys } from 'movex-core-util';
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
  // TODO: This can be redis well
  const localStore = new LocalMovexStore();

  // localStore.onCreated((s) => {
  //   console.group('[Master.LocalStore] onCreated');
  //   console.log('Item', s);
  //   console.log('All Store', localStore.all());
  //   console.groupEnd();
  // });

  localStore.onUpdated((s) => {
    console.group('[Master.LocalStore] onUpdated');
    console.log('Item', s);
    console.log('All Store', localStore.all());
    console.groupEnd();
  });

  const masterStore = movexStore === 'memory' ? localStore : movexStore;

  const mapOfResouceReducers = objectKeys(definition.resources).reduce(
    (accum, nextResoureType) => {
      const nextReducer = definition.resources[nextResoureType];

      return {
        ...accum,
        [nextResoureType]: new MovexMasterResource(nextReducer, masterStore),
      };
    },
    {} as Record<string, MovexMasterResource<any, any>>
  );

  return new MovexMasterServer(mapOfResouceReducers);
};
