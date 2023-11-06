import { createContext } from 'react';
import type {
  BaseMovexDefinitionResourcesMap,
  MovexDefinition,
} from 'movex-core-util';
import type { MovexClient, Movex } from 'movex';

export type MovexContextProps<
  TResourcesMap extends BaseMovexDefinitionResourcesMap
> =
  | {
      connected: false;
      clientId: undefined;
      movex?: Movex;
      movexConfig?: undefined;
    }
  | {
      connected: true;
      clientId: string;
      movex: MovexClient.MovexFromDefintion<TResourcesMap>;
      movexDefinition: MovexDefinition<TResourcesMap>;
    };

export const MovexContext = createContext<
  MovexContextProps<BaseMovexDefinitionResourcesMap>
>({
  movex: undefined,
  connected: false,
  clientId: undefined,
});
