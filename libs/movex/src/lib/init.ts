import io from 'socket.io-client';
import {
  EmptyFn,
  invoke,
  MovexClientInfo,
  SanitizedMovexClient,
  SocketIOEmitter,
  UnsubscribeFn,
} from 'movex-core-util';
import type {
  IOEvents,
  BaseMovexDefinitionResourcesMap,
  MovexDefinition,
} from 'movex-core-util';
import { MovexFromDefinition } from './MovexFromDefintion';
import { ConnectionToMaster } from './ConnectionToMaster';
import { Ok } from 'ts-results';

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

  const onReadyHandler = (client: SanitizedMovexClient) => {
    config.onReady(
      new MovexFromDefinition<TResourceMap>(
        movexDefinition,
        new ConnectionToMaster(emitter, client)
      )
    );
  };

  const onClockSyncHandler = (
    payload: Parameters<IOEvents<any, any, string>['onClockSync']>[0],
    acknowledge?: (
      p: ReturnType<IOEvents<any, any, any>['onClockSync']>
    ) => void
  ) => {
    const clientTime = new Date().getTime();
    console.log('on clock sync handler', { payload, acknowledge });

    // Respond with the client time
    acknowledge?.(new Ok(clientTime));
  };

  emitter.on('onClockSync', onClockSyncHandler);

  unsubscribers.push(() => {
    socket.off('onClockSync', onClockSyncHandler);
  });

  emitter.on('onReady', onReadyHandler);

  unsubscribers.push(() => {
    socket.off('onReady', onReadyHandler);
  });

  // Return the destroyer()
  return () => {
    unsubscribers.forEach(invoke);

    emitter.disconnect();
  };
};
