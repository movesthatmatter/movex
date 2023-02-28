import io, { Socket } from 'socket.io-client';
import { MovexClient, MovexClientConfig } from './MovexClient';
import { MovexResource } from './MovexResource';
import { computeCheckedState } from './util';
import { objectKeys } from 'movex-core-util';
import { ResourceFileCollectionMapBase } from './tools/resourceFile';
import { MovexReducer } from './tools/reducer';
import { AnyAction } from './tools/action';

export const createMovexInstance = (
  config: MovexClientConfig,
  ioClient?: Socket
) => {
  // This is ued like this so it can be tested!
  const socket =
    ioClient ||
    io(config.url, {
      reconnectionDelay: 1000,
      reconnection: true,
      transports: ['websocket'],
      agent: false,
      upgrade: true,
      rejectUnauthorized: false,
      query: {
        ...(config.clientId ? { clientId: config.clientId } : {}),
        apiKey: config.apiKey, // This could change
      },
      autoConnect: false,
    });

  const client = new MovexClient(socket, config);

  return client;

  // return {
  //   client,

  //   // TODO: If I can infer this from the given reducers it would be amazing!
  //   //  If not I have to pass in some weird action maps
  //   // resources: resourcesMap,

  //   registerResource: <S, A extends AnyAction>(
  //     name: string,
  //     reducer: MovexReducer<S, A>
  //   ) => {
  //     client.

  //     return;
  //   },
  // };
};
