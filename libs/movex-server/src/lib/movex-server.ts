import * as http from 'http';
import { Server as SocketServer } from 'socket.io';
import express from 'express';
import cors from 'cors';
import {
  globalLogsy,
  SocketIOEmitter,
  ConnectionToClient,
  type MovexDefinition,
  type IOEvents,
  isResourceIdentifier,
  objectKeys,
  toResourceIdentifierObj,
  MovexClientInfo,
} from 'movex-core-util';
import { MemoryMovexStore, MovexStore } from 'movex-store';
import { initMovexMaster } from 'movex-master';
import { isOneOf } from './util';

const logsy = globalLogsy.withNamespace('[MovexServer]');

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

  httpServer.on('request', app);

  const socket = new SocketServer(httpServer, {
    cors: {
      origin: corsOpts?.origin || '*',
    },
  });

  const store =
    movexStore === 'memory'
      ? new MemoryMovexStore<TDefinition['resources']>()
      : movexStore;

  const movexMaster = initMovexMaster(definition, store);

  const getClientId = (clientId: string) =>
    clientId || String(Math.random()).slice(-5);

  socket.on('connection', (io) => {
    const clientId = getClientId(io.handshake.query['clientId'] as string);
    const clientInfo = JSON.parse(
      (io.handshake.query['clientInfo'] as string) || ''
    ) as MovexClientInfo;

    logsy.info('Client Connected', { clientId, clientInfo });

    const connectionToClient = new ConnectionToClient(
      clientId,
      new SocketIOEmitter<IOEvents>(io),
      clientInfo
    );

    connectionToClient.emitClientReady();

    movexMaster.addClientConnection(connectionToClient);

    io.on('disconnect', () => {
      logsy.info('Client Disconnected', { clientId });

      movexMaster.removeConnection(clientId);
    });
  });

  app.get('/', (_, res) => {
    res.send({ message: `Welcome to Movex!` });
  });

  app.get('/store', async (_, res) => {
    store.all().map((data) => {
      res.header('Content-Type', 'application/json');
      res.send(JSON.stringify(data, null, 4));
    });
  });

  app.get('/connections', async (_, res) => {
    res.header('Content-Type', 'application/json');
    res.send(JSON.stringify(movexMaster.allClients(), null, 4));
  });

  // Resources
  // app.get('/api/resources', async (_, res) => {
  //   res.header('Content-Type', 'application/json');
  //   res.send(JSON.stringify(await store.all().resolveUnwrap(), null, 4));
  // });

  app.get('/api/resources/:rid', async (req, res) => {
    const rawRid = req.params.rid;

    if (!isResourceIdentifier(rawRid)) {
      return res.sendStatus(400); // Bad Request
    }

    const ridObj = toResourceIdentifierObj(rawRid);

    if (!isOneOf(ridObj.resourceType, objectKeys(definition.resources))) {
      return res.sendStatus(400); // Bad Request
    }

    res.header('Content-Type', 'application/json');

    return store
      .get(rawRid as any) // TODO: Not sure why this doesn't see it and needs to be casted to any?
      .map((data) => {
        res.send(JSON.stringify(data, null, 4));
      })
      .mapErr(() => {
        res.sendStatus(404);
      });
  });

  // app.post('/api/resources', async (req, res) => {
  //   // const rawRid = req.params.rid;
  //   req

  //   if (isResourceIdentifier(rawRid)) {
  //     res.header('Content-Type', 'application/json');
  //     res.send(
  //       JSON.stringify(await store.get(rawRid as any).resolveUnwrap(), null, 4)
  //     );
  //   } else {
  //     res.sendStatus(400);
  //   }
  // });

  // //start our server
  const port = process.env['port'] || 3333;
  httpServer.listen(port, () => {
    const address = httpServer.address();

    if (typeof address !== 'string') {
      logsy.info('Server started', {
        port,
        definitionResources: Object.keys(definition.resources),
      });
    }
  });
};
