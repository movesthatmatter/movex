import * as http from 'http';
import { Server as SocketServer } from 'socket.io';
import { httpServer } from './app';
import { LocalMovexStore } from 'libs/movex/src/lib/movex-store';
import { SocketIOEmitter, objectKeys } from 'movex-core-util';
import movexConfig from 'apps/movex-demo/movex.config';
import { MovexMasterResource } from 'libs/movex/src/lib/master';
import { Master } from 'movex';
import { IOEvents } from 'libs/movex/src/lib/io-connection/io-events';

const server = http.createServer();

const app = httpServer();
server.on('request', app);

const socket = new SocketServer(server, {
  cors: {
    origin: '*',
  },
});

const masterStore = new LocalMovexStore(); // TODO: This can be redis well

const mapOfResouceReducers = objectKeys(movexConfig.resources).reduce(
  (accum, nextResoureType) => {
    const nextReducer = movexConfig.resources[nextResoureType];

    return {
      ...accum,
      [nextResoureType]: new MovexMasterResource(
        nextReducer as any,
        masterStore
      ),
    };
  },
  {} as Record<string, MovexMasterResource<any, any>>
);

const movexMaster = new Master.MovexMasterServer(mapOfResouceReducers);

const getClientId = (clientId: string) =>
  clientId || String(Math.random()).slice(-5);

socket.on('connection', (io) => {
  console.log('conected to socket-io', io.handshake.query);

  // const io = new Master.ServerSocketEmitter(res.socket.server)
  // res.socket.server.io = io;
  // const movexMaster = new Master.MovexMasterServer();

  // This could be incorporated in the MovexMasterServer constructor
  //  And wrk with a generalized vesion of on("connect") and on("disconnect")

  const clientId = getClientId(io.handshake.query['clientId'] as string);

  console.log('[Next Socket] connected', clientId);

  const connection = new Master.ConnectionToClient(
    clientId,
    new SocketIOEmitter<IOEvents>(io)
    // new Master.ServerSocketEmitter(io)
  );

  io.emit('$setClientId', clientId);

  movexMaster.addClientConnection(connection);

  io.on('disconnect', () => {
    console.log('disconnected');

    movexMaster.removeConnection(clientId);
  });
});

// //start our server
const port = process.env['port'] || 3333;
server.listen(port, () => {
  const address = server.address();

  if (typeof address !== 'string') {
    console.info(`Server (http & websocket) started on port ${address?.port}`);
  }
});
