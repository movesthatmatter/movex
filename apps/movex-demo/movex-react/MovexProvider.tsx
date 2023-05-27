// TODO: This shold come from the library

import React, { useEffect, useState } from 'react';
import { initMovex } from 'libs/movex/src/lib/client';
import { MovexContextProps, MovexContext } from './MovexContext';
import { invoke } from 'movex-core-util';
import {
  BaseMovexDefinitionResourcesMap,
  MovexDefinition,
} from 'movex';

type Props<TMovexConfigResourcesMap extends BaseMovexDefinitionResourcesMap> =
  React.PropsWithChildren<{
    movexDefinition: MovexDefinition<TMovexConfigResourcesMap>;
    socketUrl: string;
  }>;

export const MovexProvider: React.FC<Props<{}>> = (props) => {
  const [contextState, setContextState] = useState<
    MovexContextProps<typeof props['movexDefinition']['resources']>
  >({
    connected: false,
    clientId: undefined,
  });

  useEffect(() => {
    const clientId = window.localStorage.getItem('movexCliendId') || undefined;

    invoke(async () => {
      // const url = `http://${props.url}`;
      // TODO: This doesn't belong here. It's a next thing so should be in a next socket provider or smtg
      // const res = await fetch(url);

      // console.log('fetch ok?', url, res.ok);

      initMovex(
        {
          clientId,
          url: props.socketUrl,
          apiKey: '',
        },
        (movex) => {
          const clientId = movex.getClientId();

          setContextState({
            connected: true,
            clientId, // TODO: Do I really need this?
            movex,
            movexDefinition: props.movexDefinition,
          });

          window.localStorage.setItem('movexCliendId', clientId);
        }
      );
    });

    // TODO: Maye add destroyer?
  }, [props.socketUrl]);

  return (
    <MovexContext.Provider value={contextState}>
      {props.children}
    </MovexContext.Provider>
  );
};
