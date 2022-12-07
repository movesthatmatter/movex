import * as RRStore from 'relational-redis-store';
import { Client, Resource } from '../types';
import { ISessionStore, SessionStoreCollectionMap } from './ISessionStore';
import { AsyncOk, AsyncResult } from 'ts-async-results';
import { toSessionError } from './SessionStoreErrors';
import { getUuid } from './util';
import { CollectionItem, UnidentifiableModel } from 'relational-redis-store';

// Note:
// This is currently depending on RRStore, but from what I see
// there's not much need for it, and in some situations it can
// add complications. In the future this can be rewritten to
// use bar redis functions, or another redis store could be written
// just for this. Some issues I see are:
//   - nesting the subscribers and subscriptions inside the object,
//     but maybe that's not that bad actually :-/

// const client_COLLECTION_STORE_OPTIONS = {
//   foreignKeys: {},
// };

// const RESOURCES_COLLECTION_STORE_OPTIONS = {
//   foreignKeys: {},
// };

// <
//   TCustomCollectionMap extends RRStore.CollectionMapBase
// >
// TCustomCollectionMap & SessionStoreCollectionMap

type SessionCollectionMap = SessionStoreCollectionMap<{
  room: Resource<{
    type: 'play';
  }>;
  game: Resource<{
    type: 'maha';
  }>;
}>;

// This extracts out the $clients and other possible private keys
type SessionCollectionMapOfResourceKeys = keyof Omit<
  SessionCollectionMap,
  keyof SessionStoreCollectionMap<{}>
>;

export class SessionStore {
  // TODO: Type this!
  // TODO: Actually this could come at the store level as generic not at method level
  static storeCollectionOptionsMap = {
    $clients: {
      foreignKeys: {},
    },
  };

  constructor(
    private store: RRStore.Store<SessionCollectionMap> // This will actually be a namespaced store underneath // pased in by outside directly (by the sdk) // private namespace: TNamespace // This will be passed into the store directly by the SDK
  ) {}

  // Peer

  createClient(p?: { id?: string; info?: {} }) {
    return this.store
      .addItemToCollection(
        '$clients',
        {
          info: p?.info,
          subscriptions: {},
        },
        p?.id || getUuid(),
        SessionStore.storeCollectionOptionsMap.$clients
      )
      .mapErr(toSessionError);
  }

  getClient(id: Client['id']) {
    return this.store
      .getItemInCollection('$clients', id)
      .mapErr(toSessionError);
  }

  getClients(ids: Client['id'][]) {
    return this.store
      .getItemsInCollection('$clients', ids)
      .mapErr(toSessionError);
  }

  getAllClients() {
    return this.store
      .getAllItemsInCollection('$clients')
      .mapErr(toSessionError);
  }

  updateClient(
    id: Client['id'],
    propsGetter: RRStore.UpdateableCollectionPropsGetter<Client>
  ) {
    return this.store
      .updateItemInCollection(
        '$clients',
        id,
        propsGetter,
        SessionStore.storeCollectionOptionsMap.$clients
      )
      .mapErr(toSessionError);
  }

  removeClient(id: string) {
    return this.store
      .removeItemInCollection('$clients', id)
      .mapErr(toSessionError);

    // TODO: Remove it from the subscribers
  }

  // Topic

  // createTopic<TName extends string>(uniqName: TName) {
  //   return this.store
  //     .addItemToCollection(
  //       '$topics',
  //       { subscribers: {} },
  //       uniqName,
  //       TOPICS_COLLECTION_STORE_OPTIONS
  //     )
  //     .map((s) => s as RRStore.CollectionItemOrReply<Topic<TName>>)
  //     .mapErr(toSessionError);
  // }

  // getTopic<TTopic extends string>(topic: TTopic) {
  //   return this.store.getItemInCollection('$topics', topic);
  // }

  // private updateTopicSubscribers<TName extends string>(
  //   name: TName,
  //   propsGetter: RRStore.UpdateableCollectionPropsGetter<Topic<TName>>
  // ) {
  //   return this.store
  //     .updateItemInCollection(
  //       '$topics',
  //       name,
  //       propsGetter,
  //       TOPICS_COLLECTION_STORE_OPTIONS
  //     )
  //     .map((t) => t as Topic<TName>)
  //     .mapErr(toSessionError);
  // }

  // Subscriptions

  // subscribeToTopic<TTopicName extends string>(
  //   name: TTopicName,
  //   peerId: Peer['id']
  // ) {
  //   return this.getPeer(peerId)
  //     .flatMap((peer) => {
  //       // TODO: This MUST BE a transaction!!!
  //       return this.updateTopicSubscribers(name, (prev) => ({
  //         ...prev,
  //         subscribers: {
  //           ...prev.subscribers,
  //           [peer.id]: null,
  //         },
  //       })).flatMap((updatedTopic) =>
  //         AsyncResult.all(
  //           new AsyncOk(updatedTopic),
  //           this.updatePeer(peerId, (prev) => ({
  //             ...prev,
  //             subscriptions: {
  //               ...prev.subscriptions,
  //               [updatedTopic.id]: null,
  //             },
  //           }))
  //         )
  //       );
  //     })
  //     .map(([topic, peer]) => ({
  //       topic,
  //       peer,
  //     }));
  // }

  // unsubscribeFromTopic<TTopicName extends string>(
  //   name: TTopicName,
  //   peerId: Peer['id']
  // ) {
  //   return this.getPeer(peerId)
  //     .flatMap((peer) => {
  //       // TODO: This MUST BE a transaction!!!
  //       return this.updateTopicSubscribers(name, (prev) => {
  //         const { [peer.id]: removed, ...nextSubscribers } = prev.subscribers;

  //         return {
  //           ...prev,
  //           subscribers: nextSubscribers,
  //         };
  //       }).flatMap((updatedTopic) =>
  //         AsyncResult.all(
  //           new AsyncOk(updatedTopic),
  //           this.updatePeer(peerId, (prev) => {
  //             const { [updatedTopic.id]: removed, ...nextSubscriptions } =
  //               prev.subscriptions;

  //             return {
  //               ...prev,
  //               subscriptions: nextSubscriptions,
  //             };
  //           })
  //         )
  //       );
  //     })
  //     .map(([topic, peer]) => ({
  //       topic,
  //       peer,
  //     }));
  // }

  // getTopicSubscribers<TTopic extends string>(topic: TTopic) {
  //   return this.getTopic(topic)
  //     .flatMap((topic) => {
  //       return this.store.getItemsInCollection(
  //         '_peers',
  //         Object.keys(topic.subscribers)
  //       );
  //     })
  //     .mapErr(toSessionError);
  // }

  // getPeerSubscriptions(peerId: Peer['id']) {
  //   return this.getPeer(peerId).flatMap((peer) => {
  //     return this.store
  //       .getItemsInCollection('$topics', Object.keys(peer.subscriptions))
  //       .mapErr(toSessionError);
  //   });
  // }

  // (Observable) Resources

  // private toResourceCollectionName = <
  //   TResourceType extends SessionCollectionMapOfResourceKeys
  // >(
  //   resourceType: TResourceType
  // ) => `resource:${resourceType}`;

  createResource<
    TResourceType extends SessionCollectionMapOfResourceKeys,
    TResourceData extends UnidentifiableModel<
      SessionCollectionMap[TResourceType]['data']
    >
  >(resourceType: TResourceType, data: TResourceData) {
    // TODO: Should the return of the Resource look like"
    // {
    //   data: {} // my Resource data?
    // }

    return this.store
      .addItemToCollection(
        resourceType as any, // TODO: Here can add the string literal types
        {
          data,
          subscribers: {},
        },
        getUuid(),
        {
          foreignKeys: {},
        }
      )
      .map(
        (r) =>
          // TODO: This shouldn't need to be recasted if the above types are fixed
          r as RRStore.CollectionItemOrReply<
            SessionCollectionMap[TResourceType]
          >
      );
  }

  // Subscriptions

  subscribeToResource<
    TResourceType extends SessionCollectionMapOfResourceKeys
  >({
    clientId,
    resourceType,
    resourceId,
  }: {
    resourceId: Resource['id'];
    resourceType: TResourceType;
    clientId: Client['id'];
  }) {
    const now = new Date().getTime();

    // First we update the resource
    return this.updateResourceSubscribers(resourceType, resourceId, (prev) => ({
      ...prev,
      [clientId]: {
        subscribedAt: now,
      },
    }))
      .flatMap((nextResource) =>
        AsyncResult.all(
          new AsyncOk(nextResource),
          this.updateClient(clientId, (prev) => ({
            ...prev,
            subscriptions: {
              ...prev.subscriptions,
              [nextResource.id]: {
                subscribedAt: now,
              },
            },
          }))
        )
      )
      .map(([resource, client]) => ({
        resource,
        client,
      }));
    // TODO: Revert the resource subscription in case of a client error
    // This is done this way to save a query of getting the client first!
    //  since we already get it when we call updateClient
    // .flatMapErr(() => {
    // })
  }

  private updateResourceSubscribers<
    TResourceType extends SessionCollectionMapOfResourceKeys
  >(
    type: TResourceType,
    id: Resource['id'],
    updateFn: (prev: Resource['subscribers']) => Resource['subscribers']
  ) {
    return this.store
      .updateItemInCollection(
        type,
        id,
        (prev) => ({
          ...prev,
          subscribers: updateFn(prev.subscribers),
        }),
        {
          foreignKeys: {}, // TODO: This guy needs to be given from outside
        } as any // TODO: Can I fix this any?
      )
      .mapErr(toSessionError);
  }

  unsubscribeFromResource<
    TResourceType extends SessionCollectionMapOfResourceKeys
  >({
    clientId,
    resourceType,
    resourceId,
  }: {
    resourceId: Resource['id'];
    resourceType: TResourceType;
    clientId: Client['id'];
  }) {
    return this.getClient(clientId) // Remove in favor of an optimized read
      .flatMap((client) => {
        // TODO: This MUST BE a transaction!!!
        return this.updateResourceSubscribers(
          resourceType,
          resourceId,
          ({ [client.id]: _, ...remainingSubscribers }) => remainingSubscribers
        ).flatMap((nextResource) =>
          AsyncResult.all(
            new AsyncOk(nextResource),
            this.updateClient(clientId, (prev) => {
              const { [nextResource.id]: removed, ...remainingSubscriptions } =
                prev.subscriptions;

              return {
                ...prev,
                subscriptions: remainingSubscriptions,
              };
            })
          )
        );
      })
      .map(([resource, client]) => ({
        resource,
        client,
      }));
  }
}
