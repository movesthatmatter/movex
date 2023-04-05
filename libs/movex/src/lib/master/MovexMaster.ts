import {
  objectKeys,
  toResourceIdentifierObj,
  toResourceIdentifierStr,
} from 'movex-core-util';
import { AsyncOk, AsyncResult } from 'ts-async-results';
import { Err, Ok } from 'ts-results';
import { MasterClientConnection } from '../io/MasterClientConnection';
import { AnyAction } from '../tools/action';
import { MovexMasterResource } from './MovexMasterResource';
import { MasterClientIOEvents } from '../io/MasterClientIOEvents';

/**
 * This lives on the server most likely, and it's where the
 * fwd and the reconciliatory action logic reside
 *
 * This is also very generic with an API to just work when run
 */
export class MovexMaster {
  // needs a store (redis, api, etc)
  // needs a way to send messages to the clients
  //  so a connection. when an incoming message comes, process it and send further
  //  but of course without knowing it's socket or local, just async so it can be tested

  constructor(
    private masterResourcesByType: Record<string, MovexMasterResource<any, any>>
  ) {}

  // This needs to respond back to the client
  // it receives emitActions and responds with Ack, fwd or reconcilitary
  addClientConnection(
    clientConnection: MasterClientConnection<any, AnyAction, string>
  ) {
    const onEmitActionHandler = (
      payload: Parameters<MasterClientIOEvents['emitAction']>[0],
      acknowledge: (p: ReturnType<MasterClientIOEvents['emitAction']>) => void
    ) => {
      const { action, rid } = payload;

      const masterResource =
        this.masterResourcesByType[toResourceIdentifierObj(rid).resourceType];

      if (!masterResource) {
        return acknowledge(new Err('MasterResourceInexistent'));
      }

      masterResource
        .applyAction(rid, clientConnection.clientId, action)
        .flatMap((applied) =>
          AsyncResult.all(
            new AsyncOk(applied),
            masterResource.getSubscribers(rid)
          )
        )
        .map(
          ([
            { nextPublic, nextPrivate, reconciliatoryActionsByClientId },
            subscribers,
          ]) => {
            // Notify the rest of the Client Subscribers of the actions
            objectKeys(subscribers).forEach((clientId) => {
              if (reconciliatoryActionsByClientId) {
                clientConnection.emitter.emit('reconciliateActions', {
                  rid,
                  ...reconciliatoryActionsByClientId[clientId],
                });
              } else {
                clientConnection.emitter.emit('fwdAction', {
                  rid,
                  ...nextPublic,
                });
              }
            });

            // Send the Acknowledgement
            const nextChecksum = nextPrivate
              ? nextPrivate.checksum
              : nextPublic.checksum;

            return acknowledge(new Ok(nextChecksum));
          }
        )
        .mapErr((e) => acknowledge(new Err('UnknownError'))); // TODO: Type this using the ResultError from Matterio
    };

    const onGetResourceStateHandler = (
      payload: Parameters<MasterClientIOEvents['getResourceState']>[0],
      acknowledge: (
        p: ReturnType<MasterClientIOEvents['getResourceState']>
      ) => void
    ) => {
      const { rid } = payload;

      const masterResource =
        this.masterResourcesByType[toResourceIdentifierObj(rid).resourceType];

      if (!masterResource) {
        return acknowledge(new Err('MasterResourceInexistent'));
      }

      masterResource
        .getState(rid, clientConnection.clientId)
        .map((checkedState) => acknowledge(new Ok(checkedState)))
        .mapErr((e) => acknowledge(new Err(e)));
    };

    const onCreateResourceHandler = (
      payload: Parameters<MasterClientIOEvents['createResource']>[0],
      acknowledge: (
        p: ReturnType<MasterClientIOEvents['createResource']>
      ) => void
    ) => {
      const { resourceState, resourceType } = payload;

      const masterResource = this.masterResourcesByType[resourceType];

      if (!masterResource) {
        return acknowledge(new Err('MasterResourceInexistent'));
      }

      masterResource
        .create(resourceType, resourceState)
        .map((r) =>
          acknowledge(
            new Ok({
              id: r.id,
              rid: toResourceIdentifierStr({
                resourceId: r.id,
                resourceType,
              }),
              state: r.state,
            })
          )
        )
        .mapErr((e) => acknowledge(new Err('UnknownError'))); // TODO: Type this using the ResultError from Matterio
    };

    clientConnection.emitter.on('emitAction', onEmitActionHandler);
    clientConnection.emitter.on('getResourceState', onGetResourceStateHandler);
    clientConnection.emitter.on('createResource', onCreateResourceHandler);

    // Unsubscribe
    return () => {
      clientConnection.emitter.off('emitAction', onEmitActionHandler);
      clientConnection.emitter.off(
        'getResourceState',
        onGetResourceStateHandler
      );
      clientConnection.emitter.off('createResource', onCreateResourceHandler);
    };
  }
}

// const impl = () => {
//   // this runs on server
//   const localStore = new LocalMovexStore<
//     GetReducerState<typeof counterReducer>
//   >();
//   const localGameStore = new LocalMovexStore<
//     GetReducerState<typeof gameReducer>
//   >();

//   const movex = new MovexMaster({
//     // Here the store could actually be the same no? if it can be generic, and since on the server
//     //  it will be an abstraction of redis, or even matterio api, I believe it could just be the same store with some casting or
//     //  most likely knwoing how to get jsut the needed resource
//     counter: new MovexMasterResource(counterReducer, localStore),
//     game: new MovexMasterResource(gameReducer, localGameStore),
//   });
//   // private store: MovexStore<TState>
// };
