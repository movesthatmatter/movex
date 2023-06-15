import io from 'socket.io-client';
import { SocketIOEmitter, objectKeys } from 'movex-core-util';
import { ConnectionToMaster } from './ConnectionToMaster';
import { IOEvents } from '../io-connection/io-events';
import {
  BaseMovexDefinitionResourcesMap,
  MovexDefinition,
} from '../public-types';
import { MovexFromDefintion } from './MovexFromDefintion';
import { MockConnectionEmitter } from '../../specs/util/MockConnectionEmitter';
import { MovexMasterResource, MovexMasterServer } from '../master';
import { LocalMovexStore } from '../movex-store';
import { orchestrateDefinedMovex } from '../../specs/util/orchestrator';
import { Master } from 'movex';

// TODO: The ClientId ideally isn't given from here bu retrieved somehow else. hmm
// Or no?
export const initMovex = <TResourceMap extends BaseMovexDefinitionResourcesMap>(
  config: {
    url: string;
    apiKey: string;
    clientId?: string;
  },
  movexDefinition: MovexDefinition<TResourceMap>
) =>
  new Promise<MovexFromDefintion<TResourceMap>>((resolve) => {
    // TODO: Here can check if the clientId already exists locally
    //  and send it over in the handshake for the server to determine what to do with it
    //  (i.e. if it's still valid and return it or create a new one)
    const socket = io(config.url, {
      reconnectionDelay: 1000,
      reconnection: true,
      transports: ['websocket'],
      agent: false,
      upgrade: false,
      rejectUnauthorized: false,
      ...(config.clientId && {
        query: {
          clientId: config.clientId,
        },
      }),
    });

    const emitter = new SocketIOEmitter<IOEvents>(socket);

    emitter.onReceivedClientId((clientId) => {
      const movex = new MovexFromDefintion<TResourceMap>(
        movexDefinition,
        new ConnectionToMaster(clientId, emitter)
      );

      // TODO: Add on reject as well?
      resolve(movex);
    });

    // TODO: Add a way to disconnect on demand
  });

// const masterStore = new LocalMovexStore<S>();

// const masterResource = new MovexMasterResource(reducer, masterStore);
// const masterServer = new MovexMasterServer({
//   [resourceType]: masterResource,
// });

export const initMovexWithLocalMaster = <
  TResourceMap extends BaseMovexDefinitionResourcesMap
  // TMovexDefinition extends MovexDefinition
>(
  movexDefinition: MovexDefinition<TResourceMap>
) => {
  // new Promise<MovexFromDefintion<TResourcesMap>>((resolve) => {
  // TODO: Here can check if the clientId already exists locally
  //  and send it over in the handshake for the server to determine what to do with it
  //  (i.e. if it's still valid and return it or create a new one)
  // const socket = io(config.url, {
  //   reconnectionDelay: 1000,
  //   reconnection: true,
  //   transports: ['websocket'],
  //   agent: false,
  //   upgrade: false,
  //   rejectUnauthorized: false,
  //   ...(config.clientId && {
  //     query: {
  //       clientId: config.clientId,
  //     },
  //   }),
  // });

  // const emitter = new SocketIOEmitter<IOEvents>(socket);

  // const emitterOnMaster = new MockConnectionEmitter<any, any, any>(
  //   config.clientId || getUuid()
  // );

  // LEFT IT HERE:
  // the idea is to be able to initiate a local movex for the examples in the docs, so we don't have to run a full server
  // for them to work. Just, simply:
  //  1. fire up a local master + clients, with the ability to add more clients (connections) on demand
  //  2. being able to open as many connections as needed
  //  3. play with it, to get the benefits locally
  // This initiator is special, and thus the provider should be special too, something like MovexLocalProvider
  //  which gives the ability to add more connections on demand through smoe methods on the returned object:
  //  { movex: Movex, addNewClientConnection: () => {}}
  // or simply returns that method: addNewClient, which return a Movex (for the client) when added!

  const masterStore = new LocalMovexStore<any>();

  const mapOfResouceReducers = objectKeys(movexDefinition.resources).reduce(
    (accum, nextResoureType) => {
      const nextReducer = movexDefinition.resources[nextResoureType];

      return {
        ...accum,
        [nextResoureType]: new MovexMasterResource(nextReducer, masterStore),
      };
    },
    {} as Record<string, MovexMasterResource<any, any>>
  );

  const masterServer = new MovexMasterServer(mapOfResouceReducers);

  return {
    addClient: (clientId: string) => {
      new Promise<MovexFromDefintion<TResourceMap>>((resolve) => {
        // const clientId = getClientId(io.handshake.query['clientId'] as string);

        const emitterOnMaster = new MockConnectionEmitter(
          clientId,
          'master-emitter'
        );

        const connection = new Master.ConnectionToClient(
          clientId,
          emitterOnMaster
        );

        masterServer.addClientConnection(connection);

        // const masterConnectionToClient = new ConnectionToClient(
        //   clientId,
        //   emitterOnMaster
        // );

        // const removeClientConnectionFromMaster =
        //   masterServer.addClientConnection(masterConnectionToClient);

        const mockedClientMovex = orchestrateDefinedMovex(
          movexDefinition,
          clientId,
          emitterOnMaster
        );

        resolve(mockedClientMovex.movex);
      });
    },
    removeClient: (clientId: string) => {
      console.log('[MovexServer] Client Disconnected', clientId);

      masterServer.removeConnection(clientId);
    },
  };

  // emitter.onReceivedClientId((clientId) => {
  //   const movex = new MovexFromDefintion<TResourcesMap>(
  //     movexDefinition,
  //     new ConnectionToMaster(clientId, emitter)
  //   );

  //   // TODO: Add on reject as well?
  //   resolve(movex);
  // });

  // TODO: Add a way to disconnect on demand
};
