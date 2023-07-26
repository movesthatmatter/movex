import React, { useEffect, useRef, useState } from 'react';
import { MovexContextProps, MovexContext } from './MovexContext';
import { MovexClient, invoke, noop } from 'movex-core-util';
import { Client, BaseMovexDefinitionResourcesMap, MovexDefinition } from 'movex';

type Props<TMovexConfigResourcesMap extends BaseMovexDefinitionResourcesMap> =
  React.PropsWithChildren<{
    movexDefinition: MovexDefinition<TMovexConfigResourcesMap>;
    endpointUrl: string;
    clientId?: MovexClient['id'];
    onConnected?: (
      state: Extract<
        MovexContextProps<TMovexConfigResourcesMap>,
        { connected: true }
      >
    ) => void;
    onDisconnected?: (
      state: Extract<
        MovexContextProps<TMovexConfigResourcesMap>,
        { connected: false }
      >
    ) => void;
  }>;

export const MovexProvider: React.FC<Props<{}>> = ({
  onConnected = noop,
  onDisconnected = noop,
  ...props
}) => {
  const [contextState, setContextState] = useState<
    MovexContextProps<typeof props['movexDefinition']['resources']>
  >({
    connected: false,
    clientId: undefined,
  });

  const didConnect = useRef(false);

  useEffect(() => {
    if (contextState.connected) {
      return;
    }

    invoke(async () => {
      const movex = await Client.initMovex(
        {
          clientId: props.clientId,
          url: props.endpointUrl,
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
      didConnect.current = true;
      // window.localStorage.setItem('movexCliendId', clientId);
    });

    // TODO: Maye add destroyer?
  }, [props.endpointUrl, props.clientId, onConnected]);

  // On Disconnect
  useEffect(() => {
    if (contextState.connected === false && didConnect) {
      onDisconnected(contextState);
    }
  }, [contextState.connected, onDisconnected]);

  return (
    <MovexContext.Provider value={contextState}>
      {props.children}
    </MovexContext.Provider>
  );
};
