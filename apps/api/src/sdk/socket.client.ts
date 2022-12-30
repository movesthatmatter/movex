import io from 'socket.io-client';

export const getSocketClient = (opts: {
  url: string;
  query: Record<string, unknown>;
}) =>
  io(opts.url, {
    reconnectionDelay: 1000,
    reconnection: true,
    transports: ['websocket'],
    agent: false,
    upgrade: true,
    rejectUnauthorized: false,
    query: opts.query,
  });
