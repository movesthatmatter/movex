import * as RRStore from 'relational-redis-store';
import { Client, Resource } from '../types';
import { SessionStoreCollectionMap } from './ISessionStore';
import { AsyncOk, AsyncResult } from 'ts-async-results';
import { toSessionError } from './SessionStoreErrors';
import { getUuid } from './util';
import { objectKeys, UnidentifiableModel } from 'relational-redis-store';

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

type ResourceIdentifier<
  TResourceType extends SessionCollectionMapOfResourceKeys
> = {
  resourceType: TResourceType;
  resourceId: Resource['id'];
};

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

  // Client

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

  removeClient(id: Client['id']) {
    return this.getClient(id)
      .flatMap(({ subscriptions }) => {
        const subscriptionNames = objectKeys(subscriptions);

        return AsyncResult.all(
          ...subscriptionNames.map((sub) => {
            const resourceType = sub.slice(
              0,
              sub.indexOf(':')
            ) as SessionCollectionMapOfResourceKeys;
            const resourceId = sub.slice(sub.indexOf(':') + 1);

            return this.removeResourceSubscriber(id, {
              resourceId,
              resourceType,
            });
          })
        );
      })
      .flatMap(() =>
        this.store.removeItemInCollection('$clients', id).mapErr(toSessionError)
      );
  }

  createResource<
    TResourceType extends SessionCollectionMapOfResourceKeys,
    TResourceData extends UnidentifiableModel<
      SessionCollectionMap[TResourceType]['data']
    >
  >(resourceType: TResourceType, data: TResourceData) {
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

  subscribeToResource<TResourceType extends SessionCollectionMapOfResourceKeys>(
    clientId: Client['id'],
    { resourceType, resourceId }: ResourceIdentifier<TResourceType>
  ) {
    const now = new Date().getTime();

    // First we update the resource
    return this.updateResourceSubscribers(
      { resourceType, resourceId },
      (prev) => ({
        ...prev,
        [clientId]: {
          subscribedAt: now,
        },
      })
    )
      .flatMap((nextResource) =>
        AsyncResult.all(
          new AsyncOk(nextResource),
          this.updateClient(clientId, (prev) => ({
            ...prev,
            subscriptions: {
              ...prev.subscriptions,
              [`${resourceType}:${nextResource.id}`]: {
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
    { resourceId, resourceType }: ResourceIdentifier<TResourceType>,
    updateFn: (prev: Resource['subscribers']) => Resource['subscribers']
  ) {
    return this.store
      .updateItemInCollection(
        resourceType,
        resourceId,
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
  >(
    clientId: Client['id'],
    { resourceType, resourceId }: ResourceIdentifier<TResourceType>
  ) {
    return this.getClient(clientId) // Remove in favor of an optimized read
      .flatMap((client) => {
        // TODO: This MUST BE a transaction!!!
        return this.removeResourceSubscriber(client.id, {
          resourceType,
          resourceId,
        }).flatMap((nextResource) =>
          AsyncResult.all(
            new AsyncOk(nextResource),
            this.removeClientSubscription(clientId, {
              resourceId,
              resourceType,
            })
          )
        );
      })
      .map(([resource, client]) => ({
        resource,
        client,
      }));
  }

  private removeResourceSubscriber<
    TResourceType extends SessionCollectionMapOfResourceKeys
  >(
    clientId: Client['id'],
    { resourceType, resourceId }: ResourceIdentifier<TResourceType>
  ) {
    return this.updateResourceSubscribers(
      {
        resourceType,
        resourceId,
      },
      ({ [clientId]: _, ...remainingSubscribers }) => remainingSubscribers
    );
  }

  private removeClientSubscription<
    TResourceType extends SessionCollectionMapOfResourceKeys
  >(
    clientId: Client['id'],
    { resourceId, resourceType }: ResourceIdentifier<TResourceType>
  ) {
    return this.updateClient(clientId, (prev) => {
      const {
        [`${resourceType}:${resourceId}` as any]: removed,
        ...remainingSubscriptions
      } = prev.subscriptions;

      return {
        ...prev,
        subscriptions: remainingSubscriptions,
      };
    });
  }

  getResource<TResourceType extends SessionCollectionMapOfResourceKeys>({
    resourceType,
    resourceId,
  }: {
    resourceType: TResourceType;
    resourceId: Resource['id'];
  }) {
    return this.store.getItemInCollection(resourceType, resourceId);
  }

  getResourceSubscribers<
    TResourceType extends SessionCollectionMapOfResourceKeys
  >(p: { resourceType: TResourceType; resourceId: Resource['id'] }) {
    return this.getResource(p)
      .flatMap(({ subscribers }) =>
        this.store.getItemsInCollection('$clients', Object.keys(subscribers))
      )
      .mapErr(toSessionError);
  }

  getClientSubscriptions(clientId: Client['id']) {
    return this.getClient(clientId).map((client) => client.subscriptions);
  }

  removeResource<TResourceType extends SessionCollectionMapOfResourceKeys>({
    resourceId,
    resourceType,
  }: {
    resourceType: TResourceType;
    resourceId: Resource['id'];
  }) {
    // This should be a TRANSACTION
    return this.getResource({ resourceType, resourceId }).flatMap(
      (prevResource) =>
        AsyncResult.all(
          ...objectKeys(prevResource.subscribers).map((cliendId) =>
            this.removeClientSubscription(cliendId, {
              resourceId,
              resourceType,
            })
          )
        ).flatMap(() =>
          this.store.removeItemInCollection(resourceType, resourceId)
        )
    );
  }
}