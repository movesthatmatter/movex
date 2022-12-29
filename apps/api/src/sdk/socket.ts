import io, { Socket } from 'socket.io-client';
// import { config } from '../config';

// let socket: Socket;

export const getSocketClient = (opts: {
  url: string;
  query: Record<string, unknown>
}) => {
  // const query = { gameId, nickname: config.USER_ID };

  return io(opts.url, {
    reconnectionDelay: 1000,
    reconnection: true,
    transports: ['websocket'],
    agent: false,
    upgrade: false,
    rejectUnauthorized: false,
    query: opts.query,
  });

  // return socket;
};
