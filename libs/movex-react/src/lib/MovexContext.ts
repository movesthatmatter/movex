import { createContext } from 'react';
import type {
  BaseMovexDefinitionResourcesMap,
  MovexDefinition,
  ResourceIdentifier,
  StringKeys,
  UnsubscribeFn,
} from 'movex-core-util';
import type { MovexClient } from 'movex';

export type MovexContextProps<
  TResourcesMap extends BaseMovexDefinitionResourcesMap
> =
  | {
      connected: false;
      clientId: undefined;
      movex?: MovexClient.Movex;
      movexConfig?: undefined;
      bindResource?: () => void;
    }
  | {
      connected: true;
      clientId: string;
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
});
