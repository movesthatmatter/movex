import { MovexReducer } from 'movex';
import { OnlyKeysOfType } from 'movex-core-util';

// export type BaseMovexDefinedResourcesMap = {
//   // [r in string]: MovexReducer;
// };
export type BaseMovexDefinedResourcesMap = Record<string, MovexReducer>

export type MovexConfig<TResourcesMap extends BaseMovexDefinedResourcesMap> = {
  url?: string;
  resources: TResourcesMap;
};
