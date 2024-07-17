import { MovexStoreItem } from 'movex-store';
import { useState } from 'react';
import { MovexLocalMasterProvider } from '../../lib/MovexLocalMasterProvider';
import { Game } from './Game';
import { initialState } from './movex';
import movexConfig from './movex.config';

export const SpeedPushGame = () => {
  const [masterStore, setMasterStore] = useState<MovexStoreItem<any>>();

  return (
    /**
     * This is using the Local Provider in order to simulate
     * multiple players in the same browser instance
     */
    <MovexLocalMasterProvider
      movexDefinition={movexConfig}
      onMasterResourceUpdated={setMasterStore}
      logger={{
        onLog: ({ method, prefix, message, payload }) => {
          // console.log('event', method, prefix, message, payload)
          console[method](prefix + ' ' + message, payload);
        },
      }}
    >
      <Game masterStore={masterStore} />
    </MovexLocalMasterProvider>
  );
};
