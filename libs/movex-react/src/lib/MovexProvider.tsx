import React, { useEffect, useRef, useState } from 'react';
import { MovexContextProps, MovexContext } from './MovexContext';
import {
  invoke,
  noop,
  type MovexClient as MovexClientUser,
  type BaseMovexDefinitionResourcesMap,
  type MovexDefinition,
  ResourceIdentifier,
  StringKeys,
  LoggingEvent,
  globalLogsy,
} from 'movex-core-util';
import { MovexClient } from 'movex';
import { ResourceObservablesRegistry } from './ResourceObservableRegistry';

export type MovexProviderProps<
  TMovexConfigResourcesMap extends BaseMovexDefinitionResourcesMap
> = React.PropsWithChildren<{
  movexDefinition: MovexDefinition<TMovexConfigResourcesMap>;
  endpointUrl: string;
  clientId?: MovexClientUser['id'];
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
  logger?: {
    onLog: (event: LoggingEvent) => void;
  };
}>;

export const MovexProvider: React.FC<
  MovexProviderProps<BaseMovexDefinitionResourcesMap>
> = ({ onConnected = noop, onDisconnected = noop, logger, ...props }) => {
  type TResourcesMap = typeof props['movexDefinition']['resources'];

  const [contextState, setContextState] = useState<
    MovexContextProps<TResourcesMap>
  >({
    connected: false,
    clientId: undefined,
  });

  // TODO: This can all ne moved into the MovexProviderClass and rename it to MovexProviderImplementation
  //   or this to MovexProviderContainer
  useEffect(() => {
    if (contextState.connected) {
      return;
    }

    invoke(async () => {
      const movex = await MovexClient.initMovex(
        {
          clientId: props.clientId,
          url: props.endpointUrl,
          apiKey: '',
        },
        props.movexDefinition
      );

      const clientId = movex.getClientId();

      // This resets each time movex re-initiates
      const resourceRegistry = new ResourceObservablesRegistry(movex);

      const nextState = {
        connected: true,
        clientId, // TODO: Do I really need this?
        movex,
        movexDefinition: props.movexDefinition,
        bindResource: <TResourceType extends StringKeys<TResourcesMap>>(
          rid: ResourceIdentifier<TResourceType>,
          onStateUpdate: (p: MovexClient.MovexBoundResource) => void
        ) => {
          const $resource = resourceRegistry.register(rid);

          onStateUpdate(new MovexClient.MovexBoundResource($resource));

          return $resource.onUpdate(() => {
            onStateUpdate(new MovexClient.MovexBoundResource($resource));
          });
        },
      } as const;

      setContextState(nextState);
    });

    // TODO: Maybe add destroyer?
  }, [props.endpointUrl, props.clientId]);

  const didPreviouslyConnect = useRef(false);

  // Fire the onConnected handler
  useEffect(() => {
    if (contextState.connected && !didPreviouslyConnect.current) {
      // TODO: How to listen to changes on the onConnected without triggering
      onConnected(contextState);
      didPreviouslyConnect.current = true;
    }
  }, [contextState.connected, onConnected]);

  // On Disconnect
  useEffect(() => {
    if (contextState.connected === false && didPreviouslyConnect.current) {
      onDisconnected(contextState);
    }
  }, [contextState.connected, onDisconnected]);

  useEffect(() => {
    if (logger) {
      return globalLogsy.onLog(logger.onLog);
    }

    return () => {};
  }, [logger]);

  return (
    <MovexContext.Provider value={contextState}>
      {props.children}
    </MovexContext.Provider>
  );
};
