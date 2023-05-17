import { MovexClient, invoke } from '../../../../movex-core-util/src';
import { Movex } from '../../lib';
import { ConnectionToMaster } from '../../lib/client/ConnectionToMaster';
import { ConnectionToClient, MovexMasterServer } from '../../lib/master';
import { MovexMasterResource } from '../../lib/master/MovexMasterResource';
import { LocalMovexStore } from '../../lib/movex-store';
import { AnyAction } from '../../lib/tools/action';
import { MovexReducer } from '../../lib/tools/reducer';
import { MockConnectionEmitter } from './MockConnectionEmitter';

export const movexClientMasterOrchestrator = () => {
  let unsubscribe = async () => {};

  const orchestrate = <S, A extends AnyAction, TResourceType extends string>({
    clientIds,
    reducer,
    resourceType,
  }: {
    clientIds: string[];
    reducer: MovexReducer<S, A>;
    resourceType: TResourceType;
  }) => {
    const masterStore = new LocalMovexStore<S>();

    const masterResource = new MovexMasterResource(reducer, masterStore);
    const masterServer = new MovexMasterServer({
      [resourceType]: masterResource,
    });

    return clientIds.map((clientId) => {
      // Would this be the only one for both client and master or seperate?
      // I believe it should be the same in order for it to work between the 2 no?
      const emitterOnMaster = new MockConnectionEmitter<S, A, TResourceType>(
        clientId
      );

      const masterConnectionToClient = new ConnectionToClient<
        S,
        A,
        TResourceType
      >(clientId, emitterOnMaster);

      const removeClientConnectionFromMaster = masterServer.addClientConnection(
        masterConnectionToClient
      );

      const mockedMovex = orchestrateMovex(clientId, emitterOnMaster);

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
  };

  return {
    unsubscribe,
    orchestrate,
  };
};

export type MovexClientMasterOrchestrator =
  typeof movexClientMasterOrchestrator;

const orchestrateMovex = <
  TState extends any,
  TAction extends AnyAction = AnyAction,
  TResourceType extends string = string
>(
  clientId: MovexClient['id'],
  emitterOnMaster: MockConnectionEmitter<TState, TAction, TResourceType>
) => {
  const emitterOnClient = new MockConnectionEmitter<
    TState,
    TAction,
    TResourceType
  >(clientId);

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
    movex: new Movex(new ConnectionToMaster(clientId, emitterOnClient)),
    emitter: emitterOnClient,
    destroy: () => {
      unsubscribers.forEach(invoke);
    },
  };
};
