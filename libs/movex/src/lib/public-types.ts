import { MovexReducer } from './tools';

// TODO: any is not really good here but it fails atm in movex server
export type BaseMovexDefinitionResourcesMap = Record<
  string,
  MovexReducer<any, any>
>;

export type UnknownMovexDefinitionResourcesMap = Record<
  string,
  MovexReducer<unknown>
>;

export type MovexDefinition<
  TResourcesMap extends BaseMovexDefinitionResourcesMap = BaseMovexDefinitionResourcesMap
> = {
  url?: string;
  resources: TResourcesMap;
};

export type MovexResourceTypesFromMovexDefinition<
  TResourcesMap extends BaseMovexDefinitionResourcesMap
> = Extract<keyof TResourcesMap, string>;

// This one doesn't make any sense 
// export type MovexResourceMapFromMovexDefinition<
//   TMovexDefinition extends MovexDefinition
// > = TMovexDefinition['resources'];
