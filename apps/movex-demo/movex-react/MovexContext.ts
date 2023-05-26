import { Movex } from 'movex';
import { createContext } from 'react';
import { BaseMovexDefinedResourcesMap, MovexConfig } from './types';

export type MovexContextProps<
  TResourcesMap extends BaseMovexDefinedResourcesMap
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
      movexConfig: MovexConfig<TResourcesMap>;
    };

export const MovexContext = createContext<
  MovexContextProps<BaseMovexDefinedResourcesMap>
>({
  movex: undefined,
  connected: false,
  clientId: undefined,
});
