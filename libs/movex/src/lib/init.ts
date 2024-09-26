import io from 'socket.io-client';
import {
  EmptyFn,
  invoke,
  MovexClientInfo,
  SanitizedMovexClient,
  SocketIOEmitter,
  UnknownRecord,
  UnsubscribeFn,
} from 'movex-core-util';
import type {
  IOEvents,
  BaseMovexDefinitionResourcesMap,
  MovexDefinition,
} from 'movex-core-util';
import { MovexFromDefinition } from './MovexFromDefintion';
import { ConnectionToMaster } from './ConnectionToMaster';

// TODO: The ClientId ideally isn't given from here bu retrieved somehow else. hmm
// Or no?
export const initMovex = <TResourceMap extends BaseMovexDefinitionResourcesMap>(
  config: {
    url: string;
    apiKey: string;
    clientId?: SanitizedMovexClient['id'];
    clientInfo?: MovexClientInfo;
    onReady: (movex: MovexFromDefinition<TResourceMap>) => void;
    onConnect?: EmptyFn;
    onDisconnect?: EmptyFn;
    onConnectionError?: (e: Error) => void;
  },
  movexDefinition: MovexDefinition<TResourceMap>
) => {
  // TODO: Do we need a registry here? Maybe so it doesn't recreate the resoures all the time
  // const registry =

  // TODO: Here can check if the clientId already exists locally
  //  and send it over in the handshake for the server to determine what to do with it
  //  (i.e. if it's still valid and return it or create a new one)
  const socket = io(config.url, {
    reconnectionDelay: 1000,
    reconnection: true,
    transports: ['websocket'],
    agent: false,
    upgrade: false,
    rejectUnauthorized: false,
    query: {
      ...(config.clientId && { clientId: config.clientId }),
      ...(config.clientInfo && {
        clientInfo: JSON.stringify(config.clientInfo),
      }),
    },
  });

  const emitter = new SocketIOEmitter<IOEvents>(socket);
  const unsubscribers: UnsubscribeFn[] = [];

  if (config.onConnect) {
    socket.on('connect', config.onConnect);

    unsubscribers.push(() => {
      socket.off('connect', config.onConnect);
    });
  }

  if (config.onDisconnect) {
    socket.on('disconnect', config.onDisconnect);

    unsubscribers.push(() => {
      socket.off('disconnect', config.onDisconnect);
    });
  }

  if (config.onConnectionError) {
    socket.on('connect_error', config.onConnectionError);

    unsubscribers.push(() => {
      socket.off('connect_error', config.onConnectionError);
    });
  }

  const onClientReadyHandler = (
    client: SanitizedMovexClient<UnknownRecord>
  ) => {
    config.onReady(
      new MovexFromDefinition<TResourceMap>(
        movexDefinition,
        new ConnectionToMaster(emitter, client)
      )
    );
  };

  emitter.on('onClientReady', onClientReadyHandler);

  unsubscribers.push(() => {
    socket.off('onClientReady', onClientReadyHandler);
  });

  // Return the destroyer()
  return () => {
    unsubscribers.forEach(invoke);

    emitter.disconnect();
  };
};
