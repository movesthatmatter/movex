import io from 'socket.io-client';
import {
  ConnectionToMaster,
  MovexClientInfo,
  SanitizedMovexClient,
  SocketIOEmitter,
} from 'movex-core-util';
import type {
  IOEvents,
  BaseMovexDefinitionResourcesMap,
  MovexDefinition,
} from 'movex-core-util';
import { MovexFromDefintion } from './MovexFromDefintion';

// TODO: The ClientId ideally isn't given from here bu retrieved somehow else. hmm
// Or no?
export const initMovex = <TResourceMap extends BaseMovexDefinitionResourcesMap>(
  config: {
    url: string;
    apiKey: string;
    clientId?: SanitizedMovexClient['id'];
    clientInfo?: MovexClientInfo;
  },
  movexDefinition: MovexDefinition<TResourceMap>
) => {
  // TODO: Do we need a registry here? Maybe so it doesn't recreate the resoures all the time
  // const registry =

  return new Promise<MovexFromDefintion<TResourceMap>>((resolve) => {
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

    emitter.on('onClientReady', (client) => {
      // This might need to be moved from here into the master connection or somewhere client specific!

      const movex = new MovexFromDefintion<TResourceMap>(
        movexDefinition,
        new ConnectionToMaster(client.id, emitter, client.info)
      );

      // TODO: Add on reject as well?
      resolve(movex);
    });

    // TODO: Add a way to disconnect on demand
  });
};
