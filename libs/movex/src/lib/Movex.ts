import io, { Socket } from 'socket.io-client';
import { MovexClient, MovexClientConfig } from './MovexClient';

export const createMovexInstance = (
  config: MovexClientConfig,
  ioClient?: Socket
) => {
  // This is used like this so it can be tested!
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

  return new MovexClient(socket, config);
};
