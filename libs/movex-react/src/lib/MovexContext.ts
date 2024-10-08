import { createContext } from 'react';
import type {
  BaseMovexDefinitionResourcesMap,
  MovexClientInfo,
  MovexDefinition,
  ResourceIdentifier,
  SanitizedMovexClient,
  StringKeys,
  UnsubscribeFn,
} from 'movex-core-util';
import type { MovexClient, Movex } from 'movex';

export type MovexContextProps<
  TResourcesMap extends BaseMovexDefinitionResourcesMap
> = MovexContextPropsNotConnected | MovexContextPropsConnected<TResourcesMap>;

export type MovexContextPropsNotConnected = {
  status: 'disconnected' | 'initiating' | 'connectionError';
  // clientId: undefined;
  // clientInfo: undefined;
  client?: undefined;
  movex?: Movex;
  movexConfig?: undefined;
  bindResource?: () => void;
};

export type MovexContextPropsConnected<
  TResourcesMap extends BaseMovexDefinitionResourcesMap
> = {
  status: 'connected';
  // clientId: string;
  // clientInfo: MovexClientInfo;
  client: SanitizedMovexClient;
  movex: MovexClient.MovexFromDefinition<TResourcesMap>;
  movexDefinition: MovexDefinition<TResourcesMap>;
  bindResource: <TResourceType extends StringKeys<TResourcesMap>>(
    rid: ResourceIdentifier<TResourceType>,
    onStateUpdate: (p: MovexClient.MovexBoundResource) => void
  ) => UnsubscribeFn;
};

export const initialMovexContext = {
  movex: undefined,
  status: 'initiating',
} as const;

export const MovexContext =
  createContext<MovexContextProps<BaseMovexDefinitionResourcesMap>>(
    initialMovexContext
  );
