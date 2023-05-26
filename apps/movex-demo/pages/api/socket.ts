import { Server as SocketServer } from 'socket.io';
import { Master } from 'movex';
import { SocketIOEmitter, objectKeys } from 'movex-core-util';
import { IOEvents } from 'libs/movex/src/lib/io-connection/io-events';
import { LocalMovexStore } from 'libs/movex/src/lib/movex-store';
import { MovexMasterResource } from 'libs/movex/src/lib/master';

import movexConfig from '../../movex.config';
// import { Socket } from 'socket.io-client';

const getClientId = (clientId: string) =>
  clientId || String(Math.random()).slice(-5);

// const getConnectionToClient = (clientId: string, socket: Socket) =>

const SocketHandler = (req, res) => {
  // console.log('req', req.query);
  // const { resourceType } = res.query;

  // if (!resourceType) {
  //   console.error('The Resource Type not given in the query');

  //   return;
  // }

  if (res.socket.server.movex) {
    console.log('Movex is already running');
  } else {
    // TODO: Ideally all of this is part of Movex Master somehow
    console.log('Movex is initializing');
    const socketIO = new SocketServer(res.socket.server);

    // The Movex Init. TODO: This should live in the movex master library

    // TODO: Could do some sort of scanner for files, but actuall that will live on matterio

    const masterStore = new LocalMovexStore(); // TODO: This can be redis well

    const mapOfResouceReducers = objectKeys(movexConfig.resources).reduce(
      (accum, nextResoureType) => {
        const nextReducer = movexConfig.resources[nextResoureType];

        return {
          ...accum,
          [nextResoureType]: new MovexMasterResource(nextReducer, masterStore),
        };
      },
      {} as Record<string, MovexMasterResource<any, any>>
    );

    const movexMaster = new Master.MovexMasterServer(mapOfResouceReducers);

    // const io = new Master.ServerSocketEmitter(res.socket.server)
    // res.socket.server.io = io;
    // const movexMaster = new Master.MovexMasterServer();

    // This could be incorporated in the MovexMasterServer constructor
    //  And wrk with a generalized vesion of on("connect") and on("disconnect")
    socketIO.on('connect', (io) => {
      const clientId = getClientId(io.handshake.query['clientId'] as string);

      console.log('[Next Socket] connected', clientId);

      const connection = new Master.ConnectionToClient(
        clientId,
        new SocketIOEmitter<IOEvents>(io)
        // new Master.ServerSocketEmitter(io)
      );

      io.emit('$setClientId', clientId);

      movexMaster.addClientConnection(connection);

      // io.onAny((e, x) => {
      //   console.log('[Next Socket] onAny', e, x);
      // });

      io.on('disconnect', () => {
        console.log('disconnecting', clientId);

        movexMaster.removeConnection(clientId);
      });
    });

    res.socket.server.movex = {
      master: movexMaster,
      socket: socketIO,
    };
  }
  res.end();
};

// Not sure this is needed
export const config = {
  api: {
    bodyParser: false,
  },
};

export default SocketHandler;
