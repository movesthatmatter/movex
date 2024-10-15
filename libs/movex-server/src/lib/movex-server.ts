import * as http from 'http';
import { Server as SocketServer } from 'socket.io';
import express from 'express';
import cors from 'cors';
import {
  globalLogsy,
  SocketIOEmitter,
  type MovexDefinition,
  type IOEvents,
  isResourceIdentifier,
  objectKeys,
  toResourceIdentifierObj,
  MovexClientInfo,
} from 'movex-core-util';
import { MemoryMovexStore, MovexStore } from 'movex-store';
import {
  ConnectionToClient,
  createMasterContext,
  initMovexMaster,
} from 'movex-master';
import { delay, isOneOf } from './util';

import { version as pkgVersion } from '../../package.json';
import { ResourceIdentifier } from 'movex-core-util';
const logsy = globalLogsy.withNamespace('[MovexServer]');

logsy.onLog((event) => {
  // if (config.DEBUG_MODE) {
  console[event.method](event.prefix, event.message, event.payload);
  // }

  // if (isOneOf(event.method, ['error', 'warn'])) {
  //   captureEvent({
  //     level: event.method === 'warn' ? 'warning' : event.method,
  //     message: event.prefix + ' | ' + String(event.message),
  //     environment: config.ENV,
  //     // TODO: add more info if needed, like the resource id at least so it can be checked in the store
  //     //  if not more relevant, timely stuff
  //     // extra: {}
  //   });
  // }
});

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
    // pingInterval: 5000,
  });

  const store =
    movexStore === 'memory'
      ? new MemoryMovexStore<TDefinition['resources']>()
      : movexStore;

  const movexMaster = initMovexMaster(definition, store);

  const getClientId = (clientId: string) =>
    clientId || String(Math.random()).slice(-5);

  socket.on('connection', async (io) => {
    const clientId = getClientId(io.handshake.query['clientId'] as string);

    const oldClientConnection = movexMaster.getConnection(clientId);

    if (oldClientConnection) {
      /**
       * Disconnects the old client if a connection is already present, in order to support the new connection
       *  This normally happens when the same user opens a new tab with the same resource present
       *
       * Note - this is the simplest approach for now, but in the future this can include more advanced use-cases
       */
      oldClientConnection.emitter.disconnect();

      movexMaster.removeConnection(clientId);

      await delay(10);
    }

    const clientInfo = JSON.parse(
      (io.handshake.query['clientInfo'] as string) || ''
    ) as MovexClientInfo;

    logsy.info('Client Connected', { clientId, clientInfo });

    const connectionToClient = new ConnectionToClient(
      new SocketIOEmitter<IOEvents>(io),
      {
        id: clientId,
        info: clientInfo,
      }
    );

    await connectionToClient.setReady();

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
    const rawRid = req.params.rid as ResourceIdentifier<
      Extract<keyof TDefinition['resources'], string>
    >;

    if (!isResourceIdentifier(rawRid)) {
      return res.sendStatus(400); // Bad Request
    }

    const ridObj = toResourceIdentifierObj(rawRid);

    if (
      !isOneOf(
        ridObj.resourceType,
        objectKeys(definition.resources) as Extract<
          keyof TDefinition['resources'],
          string
        >[]
      )
    ) {
      return res.sendStatus(400); // Bad Request
    }

    res.header('Content-Type', 'application/json');

    return store
      .get(rawRid)
      .map((data) => {
        res.send(JSON.stringify(data, null, 4));
      })
      .mapErr(() => {
        res.sendStatus(404);
      });
  });

  // Public State
  app.get('/api/resources/:rid/state', async (req, res) => {
    const masterContext = createMasterContext();

    const rawRid = req.params.rid;

    if (!isResourceIdentifier(rawRid)) {
      return res.sendStatus(400); // Bad Request
    }

    const ridObj = toResourceIdentifierObj(rawRid);

    if (!isOneOf(ridObj.resourceType, objectKeys(definition.resources))) {
      return res.sendStatus(400); // Bad Request
    }

    res.header('Content-Type', 'application/json');

    return movexMaster
      .getPublicResourceCheckedState({ rid: ridObj }, masterContext)
      .map((checkedState) => res.json(checkedState))
      .mapErr((e) => {
        if (
          isOneOf(e.reason, ['ResourceInexistent', 'MasterResourceInexistent'])
        ) {
          return res.status(404).json(e);
        }

        return res.status(500).json(e);
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

  // start the server
  const port = process.env['port'] || 3333;
  httpServer.listen(port, () => {
    // console.log(`[movex-server] v${pkgVersion} started at port ${port}.`);

    // if (typeof address !== 'string') {
    logsy.info(`v${pkgVersion} started`, {
      port,
      definitionResources: Object.keys(definition.resources),
    });
    // }
  });
};
