import React, { useEffect, useRef, useState } from 'react';
import {
  MovexContextProps,
  MovexContext,
  MovexContextPropsConnected,
} from './MovexContext';
import {
  type BaseMovexDefinitionResourcesMap,
  type MovexDefinition,
  type SanitizedMovexClient,
  invoke,
  noop,
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
  /**
   * The definition or movex.config file
   */
  movexDefinition: MovexDefinition<TMovexConfigResourcesMap>;

  /**
   * The Movex Master Instance URL
   */
  endpointUrl: string;

  /**
   * An optional Id for the client. Most often the userId in your own application userbase
   */
  clientId?: SanitizedMovexClient['id'];

  /**
   * This will be shared among all the peers in Movex, so make sure it's sanitized!
   */
  clientInfo?: SanitizedMovexClient['info'];

  /**
   * Optional Event Logger
   */
  logger?: {
    onLog: (event: LoggingEvent) => void;
  };

  /**
   * This will trigger when the connection is made
   *
   * @param state
   * @returns
   */
  onConnected?: (
    state: Extract<
      MovexContextProps<TMovexConfigResourcesMap>,
      { connected: true }
    >
  ) => void;

  /**
   * This will trigger when movex gets disconnected
   *
   * @param state
   * @returns
   */
  onDisconnected?: (
    state: Extract<
      MovexContextProps<TMovexConfigResourcesMap>,
      { connected: false }
    >
  ) => void;
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
    clientInfo: undefined,
  });

  // TODO: This can all be moved into the MovexProviderClass and rename it to MovexProviderImplementation
  //   or this to MovexProviderContainer
  useEffect(() => {
    if (contextState.connected) {
      return;
    }

    invoke(async () => {
      const movex = await MovexClient.initMovex(
        {
          clientId: props.clientId,
          clientInfo: props.clientInfo,
          url: props.endpointUrl,
          apiKey: '',
        },
        props.movexDefinition
      );

      const client = movex.getClient();

      // This resets each time movex re-initiates
      const resourceRegistry = new ResourceObservablesRegistry(movex);

      const nextState: MovexContextPropsConnected<TResourcesMap> = {
        connected: true,
        clientId: client.id,
        clientInfo: client.info,
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
