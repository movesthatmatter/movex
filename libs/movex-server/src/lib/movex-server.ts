import * as http from 'http';
import { Server as SocketServer } from 'socket.io';
import { SocketIOEmitter, logsy } from 'movex-core-util';
import {
  Master,
  MovexDefinition,
  MovexStore,
  IOEvents,
  MemoryMovexStore,
} from 'movex';
import express from 'express';
import cors from 'cors';

export const movexServer = <TDefinition extends MovexDefinition>(
  {
    httpServer = http.createServer(),
    corsOpts,
    movexStore = 'memory',
  }: {
    httpServer?: http.Server;
    corsOpts?: cors.CorsOptions;
    movexStore?: 'memory' | MovexStore<TDefinition['resources']>; // | 'redis' once it's implemented
  },
  definition: TDefinition
) => {
  const app = express();

  // this is specifx?
  app.use(cors(corsOpts));

  app.get('/', (_, res) => {
    res.send({ message: `Welcome to Movex!` });
  });

  httpServer.on('request', app);

  const socket = new SocketServer(httpServer, {
    cors: {
      origin: corsOpts?.origin || '*',
    },
  });

  const store = movexStore === 'memory' ? new MemoryMovexStore() : movexStore;

  const movexMaster = Master.initMovexMaster(definition, store);

  const getClientId = (clientId: string) =>
    clientId || String(Math.random()).slice(-5);

  socket.on('connection', (io) => {
    const clientId = getClientId(io.handshake.query['clientId'] as string);
    logsy.log('[MovexServer] Client Connected', clientId);

    const connection = new Master.ConnectionToClient(
      clientId,
      new SocketIOEmitter<IOEvents>(io)
    );

    io.emit('$setClientId', clientId);

    movexMaster.addClientConnection(connection);

    io.on('disconnect', () => {
      logsy.log('[MovexServer] Client Disconnected', clientId);

      movexMaster.removeConnection(clientId);
    });
  });

  // //start our server
  const port = process.env['port'] || 3333;
  httpServer.listen(port, () => {
    const address = httpServer.address();

    if (typeof address !== 'string') {
      logsy.info(
        `Movex Server started on port ${address?.port} for definition`,
        Object.keys(definition.resources)
      );
    }
  });
};
