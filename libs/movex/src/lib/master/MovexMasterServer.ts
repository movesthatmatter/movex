import {
  MovexClient,
  globalLogsy,
  objectKeys,
  toResourceIdentifierObj,
} from 'movex-core-util';
import { Err, Ok } from 'ts-results';
import { AnyAction } from '../tools/action';
import { MovexMasterResource } from './MovexMasterResource';
import { IOEvents } from '../io-connection/io-events';
import { ConnectionToClient } from './ConnectionToClient';
import { AsyncResult } from 'ts-async-results';

const logsy = globalLogsy.withNamespace('[MovexMasterServer]');

/**
 * This lives on the server most likely, and it's where the
 * fwd and the reconciliatory action logic reside
 *
 * This is also very generic with an API to just work when run
 */
export class MovexMasterServer {
  // needs a store (redis, api, etc)
  // needs a way to send messages to the clients
  //  so a connection. when an incoming message comes, process it and send further
  //  but of course without knowing it's socket or local, just async so it can be tested

  // TODO: This works only per one instance/machine
  // If there are multiple server instances running then we need to use redis/socket-io distribution etc..
  private clientConnectionsByClientId: Record<
    MovexClient['id'],
    ConnectionToClient<any, AnyAction, any>
  > = {};

  constructor(
    private masterResourcesByType: Record<string, MovexMasterResource<any, any>>
  ) {}

  // This needs to respond back to the client
  // it receives emitActions and responds with Ack, fwd or reconcilitary
  addClientConnection<S, A extends AnyAction, TResourceType extends string>(
    clientConnection: ConnectionToClient<S, A, TResourceType>
  ) {
    // Event Handlers
    const onEmitActionHandler = (
      payload: Parameters<
        IOEvents<S, A, TResourceType>['emitActionDispatch']
      >[0],
      acknowledge?: (
        p: ReturnType<IOEvents<S, A, TResourceType>['emitActionDispatch']>
      ) => void
    ) => {
      const { action, rid } = payload;

      const masterResource =
        this.masterResourcesByType[toResourceIdentifierObj(rid).resourceType];

      if (!masterResource) {
        return acknowledge?.(new Err('MasterResourceInexistent'));
      }

      masterResource
        .applyAction(rid, clientConnection.clientId, action)
        .map(({ nextPublic, nextPrivate, peerActions }) => {
          if (peerActions.type === 'reconcilable') {
            // TODO: Filter out the client id so it only received the ack
            objectKeys(peerActions.byClientId)
              // Take out myself
              .filter((id) => id !== clientConnection.clientId)
              .forEach((peerId) => {
                if (peerActions.byClientId[peerId]) {
                  const peerConnection =
                    this.clientConnectionsByClientId[peerId];

                  peerConnection.emitter.emit('reconciliateActions', {
                    rid,
                    ...peerActions.byClientId[peerId],
                  });

                  return;
                }
              });

            return acknowledge?.(
              new Ok({
                reconciled: true,
                ...peerActions.byClientId[clientConnection.clientId],
              } as const)
            );
          }

          // Forwardable
          objectKeys(peerActions.byClientId).forEach((peerId) => {
            if (!peerActions.byClientId[peerId]) {
              logsy.error('Inexistant Peer Connection for peerId:', peerId);
              return;
            }

            const peerConnection = this.clientConnectionsByClientId[peerId];

            // Noting to do if the connection doesn't exist
            if (!peerConnection) {
              return;
            }

            peerConnection.emitter.emit('fwdAction', {
              rid,
              ...peerActions.byClientId[peerId],
            });
          });

          // Send the Acknowledgement
          const nextChecksum = nextPrivate
            ? nextPrivate.checksum
            : nextPublic.checksum;

          return acknowledge?.(new Ok({ nextChecksum }));
        })
        .mapErr(() => acknowledge?.(new Err('UnknownError'))); // TODO: Type this using the ResultError from Matterio
    };

    const onGetResourceStateHandler = (
      payload: Parameters<IOEvents<S, A, TResourceType>['getResourceState']>[0],
      acknowledge?: (
        p: ReturnType<IOEvents<S, A, TResourceType>['getResourceState']>
      ) => void
    ) => {
      const { rid } = payload;

      const masterResource =
        this.masterResourcesByType[toResourceIdentifierObj(rid).resourceType];

      if (!masterResource) {
        return acknowledge?.(new Err('MasterResourceInexistent'));
      }

      masterResource
        .getState(rid, clientConnection.clientId)
        .map((checkedState) => acknowledge?.(new Ok(checkedState)))
        .mapErr(AsyncResult.passThrough((e) => {
          logsy.error('Get Resource Error', e);
        }))
        .mapErr((e) => acknowledge?.(new Err(e)));
    };

    const onCreateResourceHandler = (
      payload: Parameters<IOEvents<S, A, TResourceType>['createResource']>[0],
      acknowledge?: (
        p: ReturnType<IOEvents<S, A, TResourceType>['createResource']>
      ) => void
    ) => {
      const { resourceState, resourceType } = payload;
      const masterResource = this.masterResourcesByType[resourceType];

      if (!masterResource) {
        return acknowledge?.(new Err('MasterResourceInexistent'));
      }

      masterResource
        .create(resourceType, resourceState)
        .map((r) =>
          acknowledge?.(
            new Ok({
              rid: r.rid,
              state: r.state,
            })
          )
        )
        .mapErr(
          AsyncResult.passThrough((e) => {
            logsy.error('');
          })
        )
        .mapErr((e) => acknowledge?.(new Err('UnknownError'))); // TODO: Type this using the ResultError from Matterio
    };

    const onAddResourceSubscriber = (
      payload: Parameters<
        IOEvents<S, A, TResourceType>['addResourceSubscriber']
      >[0],
      acknowledge?: (
        p: ReturnType<IOEvents<S, A, TResourceType>['addResourceSubscriber']>
      ) => void
    ) => {
      const { resourceType } = toResourceIdentifierObj(payload.rid);

      const masterResource = this.masterResourcesByType[resourceType];

      if (!masterResource) {
        return acknowledge?.(new Err('MasterResourceInexistent'));
      }

      masterResource
        .addResourceSubscriber(payload.rid, clientConnection.clientId)
        .map(() => {
          acknowledge?.(Ok.EMPTY);
        })
        .mapErr((e) => acknowledge?.(new Err('UnknownError'))); // TODO: Type this using the ResultError from Matterio
    };

    const onRemoveResourceSubscriber = (
      payload: Parameters<
        IOEvents<S, A, TResourceType>['removeResourceSubscriber']
      >[0],
      acknowledge?: (
        p: ReturnType<IOEvents<S, A, TResourceType>['removeResourceSubscriber']>
      ) => void
    ) => {
      const { resourceType } = toResourceIdentifierObj(payload.rid);

      const masterResource = this.masterResourcesByType[resourceType];

      if (!masterResource) {
        return acknowledge?.(new Err('MasterResourceInexistent'));
      }

      masterResource
        .removeResourceSubscriber(payload.rid, clientConnection.clientId)
        .map(() => {
          acknowledge?.(Ok.EMPTY);
        })
        .mapErr((e) => acknowledge?.(new Err('UnknownError'))); // TODO: Type this using the ResultError from Matterio
    };

    const onPingHandler = (
      _: undefined,
      acknowledge?: (
        p: ReturnType<IOEvents<S, A, TResourceType>['ping']>
      ) => void
    ) => {
      clientConnection.emitter.emit('pong', undefined);

      acknowledge?.(new Ok(undefined));
    };

    clientConnection.emitter.on('ping', onPingHandler);
    clientConnection.emitter.on('emitActionDispatch', onEmitActionHandler);
    clientConnection.emitter.on('getResourceState', onGetResourceStateHandler);
    clientConnection.emitter.on('createResource', onCreateResourceHandler);
    clientConnection.emitter.on(
      'addResourceSubscriber',
      onAddResourceSubscriber
    );
    clientConnection.emitter.on(
      'removeResourceSubscriber',
      onRemoveResourceSubscriber
    );

    this.clientConnectionsByClientId = {
      ...this.clientConnectionsByClientId,
      [clientConnection.clientId]: clientConnection as ConnectionToClient<
        any,
        AnyAction,
        any
      >,
    };

    logsy.log(
      '[MovexMasterServer] Added Connection Succesfully:',
      clientConnection.clientId,
      '| Connections',
      Object.keys(this.clientConnectionsByClientId).length
    );

    // Unsubscribe
    return () => {
      clientConnection.emitter.off('ping', onPingHandler);
      clientConnection.emitter.off('emitActionDispatch', onEmitActionHandler);
      clientConnection.emitter.off(
        'getResourceState',
        onGetResourceStateHandler
      );
      clientConnection.emitter.off('createResource', onCreateResourceHandler);
      clientConnection.emitter.off(
        'addResourceSubscriber',
        onAddResourceSubscriber
      );
      clientConnection.emitter.off(
        'removeResourceSubscriber',
        onRemoveResourceSubscriber
      );
    };
  }

  removeConnection(clienId: MovexClient['id']) {
    const { [clienId]: removed, ...restOfConnections } =
      this.clientConnectionsByClientId;

    this.clientConnectionsByClientId = restOfConnections;

    logsy.log(
      '[MovexMasterServer] Removed Connection Succesfully',
      this.clientConnectionsByClientId,
      '| Connections:',
      Object.keys(this.clientConnectionsByClientId).length
    );
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
