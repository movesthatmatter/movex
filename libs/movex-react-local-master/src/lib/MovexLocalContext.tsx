import { createContext } from 'react';
import type { MovexMasterServer } from 'movex-master';

export type MovexLocalContextProps = {
  master: MovexMasterServer | undefined;
};

export const MovexLocalContext = createContext<MovexLocalContextProps>({
  master: undefined,
});
