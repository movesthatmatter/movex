import {
  MovexClient,
  globalLogsy,
  objectKeys,
  toResourceIdentifierObj,
  type AnyAction,
  type IOEvents,
  type ConnectionToClient,
  type AnyStringResourceIdentifier,
} from 'movex-core-util';
import { AsyncResult } from 'ts-async-results';
import { Err, Ok } from 'ts-results';
import { MovexMasterResource } from './MovexMasterResource';
import { storeItemToSanitizedClientResource } from './util';

const logsy = globalLogsy.withNamespace('[MovexMasterServer]');
/**
 * This lives on the server most likely, and it's where the
 * fwd and the reconciliatory action logic reside
 *
 * This is also very generic with an API to just work when run
 */
export class MovexMasterServer {
  // TODO: This works only per one instance/machine
  // If there are multiple server instances running then we need to use redis/socket-io distribution etc..

  private clientConnectionsByClientId: Record<
    MovexClient['id'],
    ConnectionToClient<any, AnyAction, any>
  > = {};

  // A Map of subscribers to their subsxribed resources
  private subscribersToRidsMap: Record<
    MovexClient['id'],
    Record<AnyStringResourceIdentifier, undefined>
  > = {};

  constructor(
    private masterResourcesByType: Record<string, MovexMasterResource<any, any>>
  ) {}

  /**
   * Adds the Client Connection and subscribers to all the client events
   *
   * @param clientConnection
   * @returns
   */
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

                  peerConnection.emitter.emit('onReconciliateActions', {
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
              logsy.error('Inexistant Peer Connection for peerId:', {
                peerId,
                peerActionsByClientId: peerActions.byClientId,
              });
              return;
            }

            const peerConnection = this.clientConnectionsByClientId[peerId];

            // Noting to do if the connection doesn't exist
            if (!peerConnection) {
              return;
            }

            peerConnection.emitter.emit('onFwdAction', {
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

    const onGetResourceHandler = (
      payload: Parameters<IOEvents<S, A, TResourceType>['getResourceState']>[0],
      acknowledge?: (
        p: ReturnType<IOEvents<S, A, TResourceType>['getResource']>
      ) => void
    ) => {
      const { rid } = payload;

      const masterResource =
        this.masterResourcesByType[toResourceIdentifierObj(rid).resourceType];

      if (!masterResource) {
        return acknowledge?.(new Err('MasterResourceInexistent'));
      }

      masterResource
        .getClientSpecificResource(rid, clientConnection.clientId)
        .map((r) =>
          acknowledge?.(new Ok(storeItemToSanitizedClientResource(r)))
        )
        .mapErr(
          AsyncResult.passThrough((e) => {
            logsy.error('Get Resource Error', e);
          })
        )
        .mapErr((e) => acknowledge?.(new Err(e)));
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
        .getClientSpecificState(rid, clientConnection.clientId)
        .map((checkedState) => acknowledge?.(new Ok(checkedState)))
        .mapErr(
          AsyncResult.passThrough((e) => {
            logsy.error('Get Resource Error', e);
          })
        )
        .mapErr((e) => acknowledge?.(new Err(e)));
    };

    const onGetResourceSubscribersHandler = (
      payload: Parameters<
        IOEvents<S, A, TResourceType>['getResourceSubscribers']
      >[0],
      acknowledge?: (
        p: ReturnType<IOEvents<S, A, TResourceType>['getResourceSubscribers']>
      ) => void
    ) =>
      onGetResourceHandler(payload, (r) => {
        if (r.ok) {
          acknowledge?.(new Ok(r.val.subscribers));
        } else {
          acknowledge?.(r);
        }
      });

    const onCreateResourceHandler = (
      payload: Parameters<IOEvents<S, A, TResourceType>['createResource']>[0],
      acknowledge?: (
        p: ReturnType<IOEvents<S, A, TResourceType>['createResource']>
      ) => void
    ) => {
      const { resourceState, resourceType, resourceId } = payload;
      const masterResource = this.masterResourcesByType[resourceType];

      if (!masterResource) {
        return acknowledge?.(new Err('MasterResourceInexistent'));
      }

      masterResource
        .create(resourceType, resourceState, resourceId)
        .map((r) =>
          acknowledge?.(new Ok(storeItemToSanitizedClientResource(r)))
        )
        .mapErr(
          AsyncResult.passThrough((e) => {
            logsy.error('');
          })
        )
        .mapErr(() => acknowledge?.(new Err('UnknownError'))); // TODO: Type this using the ResultError from Matterio
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
        .map((s) => {
          // Keep a record of the rid it just subscribed to so it can also be unsubscribed
          this.subscribersToRidsMap = {
            ...this.subscribersToRidsMap,
            [clientConnection.clientId]: {
              ...this.subscribersToRidsMap[clientConnection.clientId],
              [s.rid]: undefined,
            },
          };

          // Send the ack to the just-added-client
          acknowledge?.(new Ok(storeItemToSanitizedClientResource(s)));

          // Let the rest of the peer-clients know as well
          objectKeys(s.subscribers)
            // Take out just-added-client
            .filter((clientId) => clientId !== clientConnection.clientId)
            .forEach((peerId) => {
              const peerConnection = this.clientConnectionsByClientId[peerId];

              if (!peerConnection) {
                logsy.error('OnAddResourceSubscriber PeerConnectionNotFound', {
                  peerId,
                  clientId: this.clientConnectionsByClientId,
                });
                return;
              }

              peerConnection.emitter.emit('onResourceSubscriberAdded', {
                rid: payload.rid,
                clientId: clientConnection.clientId,
              });
            });
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
    clientConnection.emitter.on('getResource', onGetResourceHandler);
    clientConnection.emitter.on(
      'getResourceSubscribers',
      onGetResourceSubscribersHandler
    );
    clientConnection.emitter.on('getResourceState', onGetResourceStateHandler);
    clientConnection.emitter.on('createResource', onCreateResourceHandler);
    clientConnection.emitter.on(
      'addResourceSubscriber',
      onAddResourceSubscriber
    );

    this.clientConnectionsByClientId = {
      ...this.clientConnectionsByClientId,
      [clientConnection.clientId]: clientConnection as ConnectionToClient<
        any,
        AnyAction,
        any
      >,
    };

    logsy.info('Connection Added  Succesfully', {
      clientId: clientConnection.clientId,
      connectionsCount: Object.keys(this.clientConnectionsByClientId).length,
    });

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
    };
  }

  removeConnection(clientId: MovexClient['id']) {
    this.unsubscribeClientFromResources(clientId);

    const { [clientId]: removed, ...restOfConnections } =
      this.clientConnectionsByClientId;

    this.clientConnectionsByClientId = restOfConnections;

    logsy.info('Connection Removed', {
      clientId,
      connectionsLeft: Object.keys(this.clientConnectionsByClientId).length,
    });
  }

  private unsubscribeClientFromResources(clientId: MovexClient['id']) {
    const clientSubscriptions = this.subscribersToRidsMap[clientId];

    if (clientSubscriptions) {
      const subscribedRidsList = objectKeys(clientSubscriptions);

      subscribedRidsList.forEach(async (rid) => {
        await this.removeResourceSubscriberAndNotifyPeersOfClientUnsubscription(
          rid,
          clientId
        );

        // TODO: should this wait for the client to ack or smtg? probably not needed

        // Remove the rid from the client's record
        const { [rid]: removed, ...rest } = this.subscribersToRidsMap[clientId];

        this.subscribersToRidsMap[clientId] = rest;
      });
    }

    logsy.info('Client Subscriptions Removed', { clientId });
  }

  private async removeResourceSubscriberAndNotifyPeersOfClientUnsubscription(
    rid: AnyStringResourceIdentifier,
    subscriberClientId: MovexClient['id']
  ) {
    const { resourceType } = toResourceIdentifierObj(rid);

    const masterResource = this.masterResourcesByType[resourceType];

    if (!masterResource) {
      logsy.error(
        'RemoveResourceSubscriberAndNotifyPeersOfClientUnsubscription MasterResourceInexistent',
        { resourceType }
      );

      return;
    }

    await masterResource
      .removeResourceSubscriber(rid, subscriberClientId)
      .resolve();

    await masterResource
      .getSubscribers(rid)
      .map((clientIds) => {
        objectKeys(clientIds)
          .filter((clientId) => clientId !== subscriberClientId)
          .forEach((peerId) => {
            const peerConnection = this.clientConnectionsByClientId[peerId];

            if (!peerConnection) {
              logsy.error(
                'RemoveResourceSubscriberAndNotifyPeersOfClientUnsubscription Peer Connection not found for',
                {
                  peerId,
                  resourceType,
                }
              );
              return;
            }

            peerConnection.emitter.emit('onResourceSubscriberRemoved', {
              rid,
              clientId: subscriberClientId,
            });
          });
      })
      .resolve();

    // TODO: Should this wait for the ack form each subscriber before removing it?? Probably not, right?
  }
}
