import io from 'socket.io-client';
import { SocketIOEmitter } from 'movex-core-util';
import { ConnectionToMaster } from './ConnectionToMaster';
import { IOEvents } from '../io-connection/io-events';
import {
  BaseMovexDefinitionResourcesMap,
  MovexDefinition,
} from '../public-types';
import { MovexFromDefintion } from './MovexFromDefintion';

// TODO: The ClientId ideally isn't given from here bu retrieved somehow else. hmm
// Or no?
export const initMovex = <
  TResourcesMap extends BaseMovexDefinitionResourcesMap
>(
  config: {
    url: string;
    apiKey: string;
    clientId?: string;
  },
  movexDefinition: MovexDefinition<TResourcesMap>
) =>
  new Promise<MovexFromDefintion<TResourcesMap>>((resolve) => {
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
      ...(config.clientId && {
        query: {
          clientId: config.clientId,
        },
      }),
    });

    const emitter = new SocketIOEmitter<IOEvents>(socket);

    emitter.onReceivedClientId((clientId) => {
      const movex = new MovexFromDefintion<TResourcesMap>(
        movexDefinition,
        new ConnectionToMaster(clientId, emitter)
      );

      // TODO: Add on reject as well?
      resolve(movex);
    });

        // TODO: Add a way to disconnect on demand
  });
