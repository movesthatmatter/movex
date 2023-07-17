import {
  MovexClient,
  ResourceIdentifier,
  invoke,
  logsy,
} from 'movex-core-util';
import { Movex } from '../../lib';
import { ConnectionToMaster } from '../../lib/client/ConnectionToMaster';
import { ConnectionToClient, MovexMasterServer } from '../../lib/master';
import { MovexMasterResource } from '../../lib/master/MovexMasterResource';
import { MemoryMovexStore } from '../../lib/movex-store';
import { AnyAction } from '../../lib/tools/action';
import { MovexReducer } from '../../lib/tools/reducer';
import { MockConnectionEmitter } from './MockConnectionEmitter';
import { MovexFromDefintion } from '../../lib/client/MovexFromDefintion';
import {
  BaseMovexDefinitionResourcesMap,
  MovexDefinition,
} from '../../lib/public-types';

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
    const masterStore = new MemoryMovexStore<Record<any, () => S>>();

    const masterResource = new MovexMasterResource(reducer, masterStore);
    const masterServer = new MovexMasterServer({
      [resourceType]: masterResource,
    });

    const clients = clientIds.map((clientId) => {
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

    return {
      master: {
        getPublicState: (rid: ResourceIdentifier<TResourceType>) =>
          masterResource.getPublicState(rid),
      },
      clients,
    };
  };

  return {
    unsubscribe,
    orchestrate,
  };
};

export type MovexClientMasterOrchestrator =
  typeof movexClientMasterOrchestrator;

export const orchestrateMovex = <
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
    movex: new Movex(new ConnectionToMaster(clientId, emitterOnClient as any)),
    emitter: emitterOnClient,
    destroy: () => {
      unsubscribers.forEach(invoke);
    },
  };
};

// TODO: this could get another name and be moved into util since it's used outside in initLocalMasterMovex
export const orchestrateDefinedMovex = <
  TResourceMap extends BaseMovexDefinitionResourcesMap
>(
  movexDefinition: MovexDefinition<TResourceMap>,
  clientId: MovexClient['id'],
  emitterOnMaster: MockConnectionEmitter
) => {
  const emitterOnClient = new MockConnectionEmitter(
    clientId,
    clientId + '-emitter'
  );

  const unsubscribers = [
    emitterOnClient._onEmitted((r, ackCb) => {
      logsy.log('[Orchestrator] emitterOnClient _onEmitted', r);
      // Calling the master with the given event from the client in order to process it
      emitterOnMaster._publish(r.event, r.payload, ackCb);
    }),
    emitterOnMaster._onEmitted((r, ackCb) => {
      logsy.log('[Orchestrator] emitterOnMaster _onEmitted', r);
      // Calling the client with the given event from the client in order to process it
      emitterOnClient._publish(r.event, r.payload, ackCb);
    }),
  ];

  return {
    movex: new MovexFromDefintion<TResourceMap>(
      movexDefinition,
      new ConnectionToMaster(clientId, emitterOnClient)
    ),
    emitter: emitterOnClient,
    destroy: () => {
      unsubscribers.forEach(invoke);
    },
  };
};
