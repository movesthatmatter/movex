import React, { useEffect, useRef, useState } from 'react';
import { MovexContextProps, MovexContext } from './MovexContext';
import {
  invoke,
  noop,
  type MovexClient as MovexClientUser,
  type BaseMovexDefinitionResourcesMap,
  type MovexDefinition,
  ResourceIdentifier,
  toResourceIdentifierStr,
  ResourceIdentifierStr,
  toResourceIdentifierObj,
  StringKeys,
} from 'movex-core-util';
import { MovexClient } from 'movex';

type Props<TMovexConfigResourcesMap extends BaseMovexDefinitionResourcesMap> =
  React.PropsWithChildren<{
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
  }>;

class ResourceObservablesRegistry<
  TResourcesMap extends BaseMovexDefinitionResourcesMap
> {
  private resourceObservablesByRid: {
    [rid in ResourceIdentifierStr<string>]: {
      _movexResource: MovexClient.MovexResource<any, any, any>;
      $resource: MovexClient.MovexResourceObservable;
    };
  } = {};

  constructor(private movex: MovexClient.MovexFromDefintion<TResourcesMap>) {}

  private get<TResourceType extends StringKeys<TResourcesMap>>(
    rid: ResourceIdentifier<TResourceType>
  ) {
    return this.resourceObservablesByRid[toResourceIdentifierStr(rid)];
  }

  register<TResourceType extends StringKeys<TResourcesMap>>(
    rid: ResourceIdentifier<TResourceType>
  ) {
    const existent = this.get(rid);

    if (existent) {
      return existent.$resource;
    }

    const ridAsStr = toResourceIdentifierStr(rid);
    const { resourceType } = toResourceIdentifierObj(rid);

    const movexResource = this.movex.register(resourceType);

    const $resource = movexResource.bind(rid);

    this.resourceObservablesByRid[ridAsStr] = {
      _movexResource: movexResource,
      $resource,
    };

    return $resource;
  }
}

export const MovexProvider: React.FC<
  Props<BaseMovexDefinitionResourcesMap>
> = ({ onConnected = noop, onDisconnected = noop, ...props }) => {
  type TResourcesMap = typeof props['movexDefinition']['resources'];

  const [contextState, setContextState] = useState<
    MovexContextProps<TResourcesMap>
  >({
    connected: false,
    clientId: undefined,
  });

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

      // This resets each time movex reinitiated
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

    // TODO: Maye add destroyer?
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

  return (
    <MovexContext.Provider value={contextState}>
      {props.children}
    </MovexContext.Provider>
  );
};
