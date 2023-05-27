import * as http from 'http';
import { Server as SocketServer } from 'socket.io';
import { LocalMovexStore, MovexStore } from 'libs/movex/src/lib/movex-store';
import { SocketIOEmitter, objectKeys } from 'movex-core-util';
import { MovexMasterResource } from 'libs/movex/src/lib/master';
import { Master, MovexDefinition } from 'movex';
import { IOEvents } from 'libs/movex/src/lib/io-connection/io-events';
import express from 'express';
import cors from 'cors';

export const movexServer = (
  {
    httpServer = http.createServer(),
    corsOpts,
    movexStore = 'memory',
  }: {
    httpServer?: http.Server;
    corsOpts?: cors.CorsOptions;
    movexStore?: 'memory' | MovexStore<any, any>; // | 'redis' once it's implemented
  },
  definition: MovexDefinition
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

  // TODO: This can be redis well
  const masterStore =
    movexStore === 'memory' ? new LocalMovexStore() : movexStore;

  const mapOfResouceReducers = objectKeys(definition.resources).reduce(
    (accum, nextResoureType) => {
      const nextReducer = definition.resources[nextResoureType];

      return {
        ...accum,
        [nextResoureType]: new MovexMasterResource(nextReducer, masterStore),
      };
    },
    {} as Record<string, MovexMasterResource<any, any>>
  );

  const movexMaster = new Master.MovexMasterServer(mapOfResouceReducers);

  const getClientId = (clientId: string) =>
    clientId || String(Math.random()).slice(-5);

  socket.on('connection', (io) => {
    console.group('Movex Connection Established');
    console.log('Query', io.handshake.query);
    console.groupEnd();

    const clientId = getClientId(io.handshake.query['clientId'] as string);

    const connection = new Master.ConnectionToClient(
      clientId,
      new SocketIOEmitter<IOEvents>(io)
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
  httpServer.listen(port, () => {
    const address = httpServer.address();

    if (typeof address !== 'string') {
      console.info(`Movex Server started on port ${address?.port}`);
    }
  });
};
