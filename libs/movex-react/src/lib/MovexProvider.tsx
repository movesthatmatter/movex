import React, { useEffect, useState } from 'react';
import { Client } from 'movex';
import { MovexContextProps, MovexContext } from './MovexContext';
import { MovexClient, invoke, noop } from 'movex-core-util';
import { BaseMovexDefinitionResourcesMap, MovexDefinition } from 'movex';

type Props<TMovexConfigResourcesMap extends BaseMovexDefinitionResourcesMap> =
  React.PropsWithChildren<{
    movexDefinition: MovexDefinition<TMovexConfigResourcesMap>;
    socketUrl: string;
    clientId?: MovexClient['id'];
    onConnected?: (
      state: Extract<
        MovexContextProps<TMovexConfigResourcesMap>,
        { connected: true }
      >
    ) => void;
  }>;

export const MovexProvider: React.FC<Props<{}>> = ({
  onConnected = noop,
  ...props
}) => {
  const [contextState, setContextState] = useState<
    MovexContextProps<typeof props['movexDefinition']['resources']>
  >({
    connected: false,
    clientId: undefined,
  });

  useEffect(() => {
    // const storedClientId =
    //   window.localStorage.getItem('movexCliendId') || undefined;

    if (contextState.connected) {
      // here disconnect and reconnect b/c it means one of the url or clientId changed, so need another instance!
      // contextState.movex.

      return;
    }

    invoke(async () => {
      const movex = await Client.initMovex(
        {
          clientId: props.clientId,
          url: props.socketUrl,
          apiKey: '',
        },
        props.movexDefinition
      );

      const clientId = movex.getClientId();

      const nextState = {
        connected: true,
        clientId, // TODO: Do I really need this?
        movex,
        movexDefinition: props.movexDefinition,
      } as const;

      setContextState(nextState);

      onConnected(nextState);
      // window.localStorage.setItem('movexCliendId', clientId);
    });

    // TODO: Maye add destroyer?
  }, [props.socketUrl, props.clientId, onConnected]);

  return (
    <MovexContext.Provider value={contextState}>
      {props.children}
    </MovexContext.Provider>
  );
};
