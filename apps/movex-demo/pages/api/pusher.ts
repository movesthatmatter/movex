// import { Server as SocketServer } from 'socket.io';
// import { Master } from 'movex';
// import { PusherEmitter, objectKeys } from 'movex-core-util';
// import { IOEvents } from 'libs/movex/src/lib/io-connection/io-events';
// import { LocalMovexStore } from 'libs/movex/src/lib/movex-store';
// import { MovexMasterResource } from 'libs/movex/src/lib/master';
// import Pusher from 'pusher-js';
// import movexConfig from '../../movex.config';
// import { config as AppConfig } from '../../app.config';
// // import { Socket } from 'socket.io-client';

// const getClientId = (clientId: string) =>
//   clientId || String(Math.random()).slice(-5);

// // const getConnectionToClient = (clientId: string, socket: Socket) =>

// const PusherHandler = (req, res) => {
//   // console.log('req', req.query);
//   // const { resourceType } = res.query;

//   // if (!resourceType) {
//   //   console.error('The Resource Type not given in the query');

//   //   return;
//   // }

//   if (res.socket.server.movex) {
//     console.log('Movex is already running');
//   } else {
//     // TODO: Ideally all of this is part of Movex Master somehow
//     console.log('Movex is initializing');

//     const pusher = new Pusher(AppConfig.PUSHER_API_KEY, {
//       // id: 1608123,
//       // key: 'c8e757bc4fa0afce03ce',
//       // secret: '1ea4eaaa0a0c21dd8590',
//       cluster: AppConfig.PUSHER_CLUSTER,
//       // useTLS: true,
//     });

//     // const socketIO = new SocketServer(res.socket.server);

//     // The Movex Init. TODO: This should live in the movex master library

//     // TODO: Could do some sort of scanner for files, but actuall that will live on matterio

//     const masterStore = new LocalMovexStore(); // TODO: This can be redis well

//     const mapOfResouceReducers = objectKeys(movexConfig.resources).reduce(
//       (accum, nextResoureType) => {
//         const nextReducer = movexConfig.resources[nextResoureType];

//         return {
//           ...accum,
//           [nextResoureType]: new MovexMasterResource(nextReducer, masterStore),
//         };
//       },
//       {} as Record<string, MovexMasterResource<any, any>>
//     );

//     const movexMaster = new Master.MovexMasterServer(mapOfResouceReducers);

//     const channel = pusher.channel('movex');

//     // channel.handleEvent()
//     channel.emit('$setClientId', )

//     // const io = new Master.ServerSocketEmitter(res.socket.server)
//     // res.socket.server.io = io;
//     // const movexMaster = new Master.MovexMasterServer();

//     // This could be incorporated in the MovexMasterServer constructor
//     //  And wrk with a generalized vesion of on("connect") and on("disconnect")
//     // socketIO.on('connect', (io) => {
//       const clientId = getClientId(io.handshake.query['clientId'] as string);

//       console.log('[Next Socket] connected', clientId);

//       const connection = new Master.ConnectionToClient(
//         clientId,
//         new PusherEmitter<IOEvents>(pusher, {})
//         // new SocketIOEmitter<IOEvents>(io)
//       );

//       io.emit('$setClientId', clientId);

//       movexMaster.addClientConnection(connection);

//       // io.onAny((e, x) => {
//       //   console.log('[Next Socket] onAny', e, x);
//       // });

//       io.on('disconnect', () => {
//         console.log('disconnecting', clientId);

//         movexMaster.removeConnection(clientId);
//       });
//     // });

//     res.socket.server.movex = {
//       master: movexMaster,
//       pusher,
//     };
//   }

//   res.json('ok');
//   res.end();
// };

// // Not sure this is needed
// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };

// export default PusherHandler;
