import { ConnectionToMaster, MovexFromDefinition } from 'movex';
import {
  BaseMovexDefinitionResourcesMap,
  globalLogsy as logsy,
  invoke,
  MovexClient,
  MovexDefinition,
} from 'movex-core-util';
import { MockConnectionEmitter } from 'movex-master';

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
      logsy.debug('EmitterOnClient _onEmitted', r);
      // Calling the master with the given event from the client in order to process it
      emitterOnMaster._publish(r.event, r.payload, ackCb);
    }),
    emitterOnMaster._onEmitted((r, ackCb) => {
      logsy.debug('EmitterOnMaster _onEmitted', r);
      // Calling the client with the given event from the master in order to process it
      emitterOnClient._publish(r.event, r.payload, ackCb);
    }),
  ];

  return {
    movex: new MovexFromDefinition<TResourceMap>(
      movexDefinition,
      new ConnectionToMaster(emitterOnClient, {
        id: clientId,
        info: {
          _clientType: 'orchestrator', // TODO: Take this one out
        },
        clockOffset: 0,
      })
    ),
    emitter: emitterOnClient,
    destroy: () => {
      unsubscribers.forEach(invoke);
    },
  };
};
