import { useState } from 'react';
import movexConfig from './movex.config';
import { Game } from './Game';
import { MovexLocalMasterProvider } from 'movex-react-local-master';
import { MovexStoreItem } from 'movex-store';

export default function App() {
  const [masterStore, setMasterStore] = useState<MovexStoreItem<any>>();

  return (
    /**
     * This is using the Local Provider in order to simulate
     * multiple players in the same browser instance
     */
    <MovexLocalMasterProvider
      movexDefinition={movexConfig}
      onMasterResourceUpdated={setMasterStore}
    >
      <Game masterStore={masterStore} />
    </MovexLocalMasterProvider>
  );
}
