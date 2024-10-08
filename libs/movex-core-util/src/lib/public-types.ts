import { AnyAction, ToPublicAction } from './action';
import { LoggingEvent } from './Logsy';
import { type MovexReducer } from './reducer';

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
  // @deprecated
  url?: string;
  resources: TResourcesMap;
};

export type MovexResourceTypesFromMovexDefinition<
  TResourcesMap extends BaseMovexDefinitionResourcesMap
> = Extract<keyof TResourcesMap, string>;

export type MovexLogger = {
  onLog?: (event: LoggingEvent) => void;
};



export type MovexDispatchOf<A extends AnyAction> = (
  action: ToPublicAction<A> // TODO: Should this be ToPublic??
) => void;

// This one doesn't make any sense
// export type MovexResourceMapFromMovexDefinition<
//   TMovexDefinition extends MovexDefinition
// > = TMovexDefinition['resources'];
