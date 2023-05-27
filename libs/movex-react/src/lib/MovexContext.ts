import { createContext } from 'react';
import { Movex, BaseMovexDefinitionResourcesMap, MovexDefinition } from 'movex';

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
      movex: Movex;
      movexDefinition: MovexDefinition<TResourcesMap>;
    };

export const MovexContext = createContext<
  MovexContextProps<BaseMovexDefinitionResourcesMap>
>({
  movex: undefined,
  connected: false,
  clientId: undefined,
});
