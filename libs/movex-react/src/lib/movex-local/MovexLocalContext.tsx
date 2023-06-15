import { createContext } from 'react';
import { MovexMasterServer } from 'movex';

export type MovexLocalContextProps = {
  master: MovexMasterServer | undefined;
};

export const MovexLocalContext = createContext<MovexLocalContextProps>({
  master: undefined,
});
