import * as RRStore from 'relational-redis-store';
import { AsyncOk, AsyncResult } from 'ts-async-results';
import { toSessionError } from './SessionStoreErrors';
import { getUuid, toResourceIdentifier } from './util';
import { objectKeys, UnidentifiableModel } from 'relational-redis-store';
import {
  AnySessionResourceCollectionMap,
  OnlySessionCollectionMapOfResourceKeys,
  ResourceIdentifier,
  ResourceIdentifierString,
  SessionClient,
  SessionResource,
  SessionStoreCollectionMap,
  UnknwownSessionResourceCollectionMap,
} from '@mtm/server-sdk';

// Note:
// This is currently depending on RRStore, but from what I see
// there's not much need for it, and in some situations it can
// add complications. In the future this can be rewritten to
// use bar redis functions, or another redis store could be written
// just for this. Some issues I see are:
//   - nesting the subscribers and subscriptions inside the object,
//     but maybe that's not that bad actually :-/
export class SessionStore<
  ResourceCollectionMap extends UnknwownSessionResourceCollectionMap = AnySessionResourceCollectionMap,
  SessionCollectionMap extends SessionStoreCollectionMap<ResourceCollectionMap> = SessionStoreCollectionMap<ResourceCollectionMap>,
  SessionCollectionMapOfResourceKeys extends OnlySessionCollectionMapOfResourceKeys<ResourceCollectionMap> = OnlySessionCollectionMapOfResourceKeys<ResourceCollectionMap>
> {
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
        } as any, // TODO: Fix this stupid type casting
        p?.id || getUuid(),
        SessionStore.storeCollectionOptionsMap.$clients as any // TODO: Fix this stupid type casting
      )
      .mapErr(toSessionError);
  }

  getClient(id: SessionClient['id']) {
    return this.store
      .getItemInCollection('$clients', id)
      .mapErr(toSessionError);
  }

  getClients(ids: SessionClient['id'][]) {
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
    id: SessionClient['id'],
    propsGetter: RRStore.UpdateableCollectionPropsGetter<SessionClient>
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

  removeClient(id: SessionClient['id']) {
    return this.getClient(id)
      .flatMap((prevClient) => {
        const subscriptionNames = objectKeys(prevClient.subscriptions);

        return AsyncResult.all(
          new AsyncOk(prevClient),
          ...subscriptionNames.map((sub) =>
            this.removeResourceSubscriber(
              id,
              toResourceIdentifier(
                sub
              ) as ResourceIdentifier<SessionCollectionMapOfResourceKeys>
            )
          )
        );
      })
      .flatMap(([prevClient]) =>
        AsyncResult.all(
          new AsyncOk(prevClient),
          this.store
            .removeItemInCollection('$clients', id)
            .mapErr(toSessionError)
        )
      )
      .map(([prevClient, r]) => ({
        ...r,
        item: {
          id: prevClient.id,
          subscriptions: prevClient.subscriptions,
        },
      }));
  }

  createResource<
    TResourceType extends SessionCollectionMapOfResourceKeys,
    TResourceData extends UnidentifiableModel<
      SessionCollectionMap[TResourceType]['data']
    >
  >({
    resourceType,
    resourceData,
    resourceId = getUuid(),
  }: {
    resourceType: TResourceType;
    resourceData: TResourceData;
    resourceId?: string;
  }) {
    return this.store
      .addItemToCollection(
        resourceType, // TODO: Here can add the string literal types
        {
          data: resourceData,
          subscribers: {},
        } as any, // TODO: Fix this stupid type casting
        resourceId,
        {
          foreignKeys: {} as any, // TODO: Fix this stupid type casting,
        }
      )
      .map(
        (r) =>
          // TODO: This shouldn't need to be recasted if the above types are fixed
          r as RRStore.CollectionItemOrReply<
            SessionCollectionMap[TResourceType]
          >
      )
      .map((r) => ({
        ...r,
        item: {
          ...r.item,
          $resource: resourceType,
        },
      }));
  }

  updateResourceData<
    TResourceType extends SessionCollectionMapOfResourceKeys,
    TResourceData extends UnidentifiableModel<
      SessionCollectionMap[TResourceType]['data']
    >
  >(
    resourceIdentifier:
      | ResourceIdentifier<TResourceType>
      | ResourceIdentifierString<TResourceType>,
    dataGetter:
      | Partial<TResourceData>
      | ((prev: TResourceData) => Partial<TResourceData>)
  ) {
    const { resourceId, resourceType } =
      toResourceIdentifier(resourceIdentifier);

    return this.store
      .updateItemInCollection(
        resourceType,
        resourceId,
        typeof dataGetter === 'function'
          ? (prev) => {
              return {
                ...prev,
                data: dataGetter(prev.data as TResourceData),
              };
            }
          : ({
              data: dataGetter,
            } as any),
        {
          foreignKeys: {} as any,
        }
      )
      .map(
        (r) =>
          r as unknown as RRStore.CollectionItemOrReply<
            SessionCollectionMap[TResourceType]
          >
      )
      .map((r) => ({
        ...r,
        $resource: resourceType,
      }));
    // .map(({ item }) =>
    //   objectKeys(item.subscribers).reduce(
    //     (accum, nextId) => ({
    //       ...accum,
    //       [nextId]: {
    //         ...item.subscribers[nextId],
    //         id: nextId,
    //       },
    //     }),
    //     {} as Record<
    //       Resource['id'],
    //       {
    //         id: Resource['id'];
    //         subscribedAt: Resource['subscribers'][string]['subscribedAt'];
    //       }
    //     >
    //   )
    // ).map((s) => {
    //   s['s'].
    // });
  }

  getResource<TResourceType extends SessionCollectionMapOfResourceKeys>({
    resourceType,
    resourceId,
  }: {
    resourceType: TResourceType;
    resourceId: SessionResource['id'];
  }) {
    return this.store
      .getItemInCollection(resourceType as string, resourceId)
      .map((r) => ({
        ...r,
        $resource: resourceType,
      }));
  }

  getAllResourcesOfType<
    TResourceType extends SessionCollectionMapOfResourceKeys
  >(resourceType: TResourceType) {
    return this.store.getAllItemsInCollection(resourceType).map((all) =>
      all.map((r) => ({
        ...r,
        $resource: resourceType,
      }))
    );
  }

  removeAllResourcesOfType<
    TResourceType extends SessionCollectionMapOfResourceKeys
  >(resourceType: TResourceType) {
    return this.store.removeCollection(resourceType);
  }

  // Subscriptions

  subscribeToResource<TResourceType extends SessionCollectionMapOfResourceKeys>(
    clientId: SessionClient['id'],
    resourceIdentifierOrString:
      | ResourceIdentifier<TResourceType>
      | ResourceIdentifierString<TResourceType>
  ) {
    const now = new Date().getTime();

    const { resourceId, resourceType } = toResourceIdentifier(
      resourceIdentifierOrString
    );

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
        resource: {
          ...resource,
          $resource: resourceType,
        },
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
    identifier:
      | ResourceIdentifier<TResourceType>
      | ResourceIdentifierString<TResourceType>,
    updateFn: (
      prev: SessionResource['subscribers']
    ) => SessionResource['subscribers']
  ) {
    const { resourceId, resourceType } = toResourceIdentifier(identifier);

    return this.store
      .updateItemInCollection(
        resourceType as string,
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
    clientId: SessionClient['id'],
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
        resource: {
          ...resource,
          $resource: resourceType,
        },
        client,
      }));
  }

  private removeResourceSubscriber<
    TResourceType extends SessionCollectionMapOfResourceKeys
  >(
    clientId: SessionClient['id'],
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
    clientId: SessionClient['id'],
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

  getResourceSubscribers<
    TResourceType extends SessionCollectionMapOfResourceKeys
  >(p: { resourceType: TResourceType; resourceId: SessionResource['id'] }) {
    return this.getResource(p)
      .flatMap(({ subscribers }) =>
        this.store.getItemsInCollection('$clients', Object.keys(subscribers))
      )
      .mapErr(toSessionError);
  }

  getClientSubscriptions(clientId: SessionClient['id']) {
    return this.getClient(clientId).map((client) => client.subscriptions);
  }

  removeResource<TResourceType extends SessionCollectionMapOfResourceKeys>({
    resourceId,
    resourceType,
  }: {
    resourceType: TResourceType;
    resourceId: SessionResource['id'];
  }) {
    // This should be a TRANSACTION
    return this.getResource({ resourceType, resourceId }).flatMap(
      (prevResource) => {
        return AsyncResult.all(
          // TODO: Optimization: This could be batched at Redis level
          ...objectKeys(prevResource.subscribers).map((cliendId) =>
            this.removeClientSubscription(cliendId, {
              resourceId,
              resourceType,
            })
          )
        )
          .flatMap(() =>
            this.store.removeItemInCollection(
              resourceType as string,
              resourceId
            )
          )
          .map((removedResource) => ({
            ...removedResource,
            item: {
              resourceType,
              resourceId,
              subscribers: prevResource.subscribers,
            },
          }));
      }
    );
  }
}
