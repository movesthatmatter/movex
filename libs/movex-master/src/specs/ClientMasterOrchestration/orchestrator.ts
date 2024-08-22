import {
  ResourceIdentifier,
  invoke,
  AnyAction,
  MovexReducer,
  MovexClientInfo,
  SanitizedMovexClient,
} from 'movex-core-util';
import { Movex, ConnectionToMaster } from 'movex';
import { MovexMasterResource, MovexMasterServer } from 'movex-master';
import { MemoryMovexStore } from 'movex-store';
import { MockConnectionEmitter } from '../../lib/MockConnectionEmitter';
import { ConnectionToClient } from '../../lib/ConnectionToClient';

// TODO: This was added on April 16th 2024, when I added the subscribers info (client info)

export const movexClientMasterOrchestrator = <
  TClientInfo extends MovexClientInfo
>(
  clientInfo: TClientInfo = {} as TClientInfo
) => {
  let unsubscribe = async () => {};

  const orchestrate = <
    S,
    A extends AnyAction,
    TResourceType extends string,
    TClientInfo extends MovexClientInfo
  >({
    clientIds,
    reducer,
    resourceType,
  }: {
    clientIds: string[];
    reducer: MovexReducer<S, A>;
    resourceType: TResourceType;
  }) => {
    const masterStore = new MemoryMovexStore<Record<any, () => S>>();

    const masterResource = new MovexMasterResource(reducer, masterStore);
    const masterServer = new MovexMasterServer({
      [resourceType]: masterResource,
    });

    const clientEmitters: MockConnectionEmitter<S, A, TResourceType>[] = [];

    const clients = clientIds.map((clientId) => {
      const client = {
        id: clientId,
        // TODO: If this needs to be given here is where it can be
        info: {} as TClientInfo,
      };

      // Would this be the only one for both client and master or seperate?
      // I believe it should be the same in order for it to work between the 2 no?
      const emitterOnMaster = new MockConnectionEmitter<S, A, TResourceType>(
        clientId
      );

      const masterConnectionToClient = new ConnectionToClient<
        S,
        A,
        TResourceType,
        TClientInfo
      >(emitterOnMaster, client);

      const removeClientConnectionFromMaster = masterServer.addClientConnection(
        masterConnectionToClient
      );

      const mockedMovex = orchestrateMovex(emitterOnMaster, client);

      clientEmitters.push(mockedMovex.emitter);

      // TODO: This could be done better, but since the unsibscriber is async need to work iwth an sync iterator
      //  for now this should do
      const oldUnsubscribe = unsubscribe;
      unsubscribe = async () => {
        await oldUnsubscribe();

        removeClientConnectionFromMaster();

        await masterStore.clearAll().resolveUnwrap();

        mockedMovex.destroy();
      };

      return mockedMovex.movex.register(resourceType, reducer);
    });

    return {
      master: {
        getPublicState: (rid: ResourceIdentifier<TResourceType>) =>
          masterResource.getPublicState(rid),
      },
      clients,
      $util: {
        pauseEmit: () => {
          clientEmitters.forEach((c) => c._pauseEmit());
        },
        resumeEmit: () => {
          clientEmitters.forEach((c) => c._resumeEmit());
        },
        setEmitDelay: (ms: number) => {
          clientEmitters.forEach((c) => c._setEmitDelay(ms));
        },
        clientEmitters,
      },
    };
  };

  return {
    unsubscribe,
    orchestrate,
  };
};

const orchestrateMovex = <
  TState extends any,
  TAction extends AnyAction,
  TResourceType extends string,
  TClientInfo extends MovexClientInfo
>(
  emitterOnMaster: MockConnectionEmitter<TState, TAction, TResourceType>,
  client: SanitizedMovexClient<TClientInfo>
) => {
  const emitterOnClient = new MockConnectionEmitter<
    TState,
    TAction,
    TResourceType
  >(client.id);

  const unsubscribers = [
    emitterOnClient._onEmitted((r, ackCb) => {
      // Calling the master with the given event from the client in order to process it
      emitterOnMaster._publish(r.event, r.payload, ackCb);
    }),
    emitterOnMaster._onEmitted((r, ackCb) => {
      // Calling the client with the given event from the client in order to process it
      emitterOnClient._publish(r.event, r.payload, ackCb);
    }),
  ];

  return {
    movex: new Movex(
      new ConnectionToMaster(
        emitterOnClient as any, // TODO: Fix this type cast
        client
      )
    ),
    emitter: emitterOnClient,
    destroy: () => {
      unsubscribers.forEach(invoke);
    },
  };
};
