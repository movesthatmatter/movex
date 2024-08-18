import { MovexLogger } from 'movex-core-util';
import { MovexStoreItem } from 'movex-store';
import { useState } from 'react';
import { MovexLocalMasterProvider } from '../../lib/MovexLocalMasterProvider';
import { Game } from './Game';
import movexConfig from './movex.config';

type Props = {
  logger?: MovexLogger;
};

export const SpeedPushGame = (props: Props) => {
  const [masterStore, setMasterStore] = useState<MovexStoreItem<any>>();

  return (
    /**
     * This is using the Local Provider in order to simulate
     * multiple players in the same browser instance
     */
    <MovexLocalMasterProvider
      movexDefinition={movexConfig}
      onMasterResourceUpdated={(s) => {
        console.log('master resource updated', s);
        setMasterStore(s);
      }}
      logger={props.logger}
    >
      <Game masterStore={masterStore} />
    </MovexLocalMasterProvider>
  );
};
