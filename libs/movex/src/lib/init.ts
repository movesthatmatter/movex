import io from 'socket.io-client';
import { ConnectionToMaster, SocketIOEmitter } from 'movex-core-util';
import type {
  IOEvents,
  BaseMovexDefinitionResourcesMap,
  MovexDefinition,
} from 'movex-core-util';
import { MovexFromDefintion } from './MovexFromDefintion';

// onResourceStateUpdate(
//   rid: AnyResourceIdentifier,
//   fn: (nextState: any) => void
// ) {
//   return this.pubsy.subscribe(toResourceIdentifierStr(rid), fn);
// }
// }

// TODO: The ClientId ideally isn't given from here bu retrieved somehow else. hmm
// Or no?
export const initMovex = <TResourceMap extends BaseMovexDefinitionResourcesMap>(
  config: {
    url: string;
    apiKey: string;
    clientId?: string;
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
      ...(config.clientId && {
        query: {
          clientId: config.clientId,
        },
      }),
    });

    const emitter = new SocketIOEmitter<IOEvents>(socket);

    emitter.on('setClientId', (clientId) => {
      // This might need to be moved from here into the master connection or somewhere client specific!
      const movex = new MovexFromDefintion<TResourceMap>(
        movexDefinition,
        new ConnectionToMaster(clientId, emitter)
      );

      // TODO: Add on reject as well?
      resolve(movex);
    });

    // TODO: Add a way to disconnect on demand
  });
};
