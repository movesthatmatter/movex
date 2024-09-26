import React, { useEffect, useRef, useState } from 'react';
import {
  MovexContextProps,
  MovexContext,
  MovexContextPropsConnected,
  initialMovexContext,
} from './MovexContext';
import {
  type BaseMovexDefinitionResourcesMap,
  type MovexDefinition,
  type SanitizedMovexClient,
  noop,
  ResourceIdentifier,
  StringKeys,
  globalLogsy,
  MovexLogger,
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
  logger?: MovexLogger;

  onConnectionStatusChange?: (
    state: MovexContextProps<TMovexConfigResourcesMap>
  ) => void;
}>;

export const MovexProvider: React.FC<
  MovexProviderProps<BaseMovexDefinitionResourcesMap>
> = ({ onConnectionStatusChange, logger, ...props }) => {
  type TResourcesMap = typeof props['movexDefinition']['resources'];

  const [contextState, setContextState] =
    useState<MovexContextProps<TResourcesMap>>(initialMovexContext);

  // TODO: This can all be moved into the MovexProviderClass and rename it to MovexProviderImplementation
  //   or this to MovexProviderContainer
  useEffect(() => {
    return MovexClient.initMovex(
      {
        clientId: props.clientId,
        clientInfo: props.clientInfo,
        url: props.endpointUrl,
        apiKey: '',
        onReady: (movex) => {
          const client = movex.getClient();

          // This resets each time movex re-initiates
          const resourceRegistry = new ResourceObservablesRegistry(movex);

          const nextState: MovexContextPropsConnected<TResourcesMap> = {
            status: 'connected',
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
        },
        onDisconnect: () => {
          globalLogsy.info('[MovexProvider] Disconnected.');

          setContextState({
            ...initialMovexContext,
            status: 'disconnected',
          });
        },
        onConnectionError: (e) => {
          globalLogsy.error('[MovexProvider] Connection Error', {
            error: e,
          });

          setContextState({
            ...initialMovexContext,
            status: 'connectionError',
          });
        },
      },
      props.movexDefinition
    );
  }, [props.endpointUrl, props.clientId]);

  const prevStatus = useRef(contextState.status);

  useEffect(() => {
    onConnectionStatusChange?.(contextState);
    prevStatus.current = contextState.status;
  }, [contextState.status, onConnectionStatusChange]);

  useEffect(() => {
    if (logger?.onLog) {
      return globalLogsy.onLog(logger.onLog);
    }

    return noop;
  }, [logger]);

  return (
    <MovexContext.Provider value={contextState}>
      {props.children}
    </MovexContext.Provider>
  );
};
