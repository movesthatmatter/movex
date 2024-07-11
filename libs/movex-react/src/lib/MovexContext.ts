import { createContext } from 'react';
import type {
  BaseMovexDefinitionResourcesMap,
  MovexClientInfo,
  MovexDefinition,
  ResourceIdentifier,
  StringKeys,
  UnsubscribeFn,
} from 'movex-core-util';
import type { MovexClient, Movex } from 'movex';

export type MovexContextProps<
  TResourcesMap extends BaseMovexDefinitionResourcesMap
> = MovexContextPropsNotConnected | MovexContextPropsConnected<TResourcesMap>;

export type MovexContextPropsNotConnected = {
  connected: false;
  clientId: undefined;
  clientInfo: undefined;
  movex?: Movex;
  movexConfig?: undefined;
  bindResource?: () => void;
};

export type MovexContextPropsConnected<
  TResourcesMap extends BaseMovexDefinitionResourcesMap
> = {
  connected: true;
  clientId: string;
  clientInfo: MovexClientInfo;
  movex: MovexClient.MovexFromDefintion<TResourcesMap>;
  movexDefinition: MovexDefinition<TResourcesMap>;
  bindResource: <TResourceType extends StringKeys<TResourcesMap>>(
    rid: ResourceIdentifier<TResourceType>,
    onStateUpdate: (p: MovexClient.MovexBoundResource) => void
  ) => UnsubscribeFn;
};

export const MovexContext = createContext<
  MovexContextProps<BaseMovexDefinitionResourcesMap>
>({
  movex: undefined,
  connected: false,
  clientId: undefined,
  clientInfo: undefined,
});
