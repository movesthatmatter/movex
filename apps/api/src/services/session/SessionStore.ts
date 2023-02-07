import * as RRStore from 'relational-redis-store';
import { AsyncOk, AsyncResult } from 'ts-async-results';
import { toSessionError } from './SessionStoreErrors';
import { getUuid } from './util';
import {
  objectKeys,
  UnidentifiableModel,
  UnknownRecord,
} from 'relational-redis-store';
import {
  GenericResource,
  invoke,
  NestedObjectUtil,
  OnlySessionCollectionMapOfResourceKeys,
  ResourceIdentifier,
  ResourceShape,
  SessionClient,
  SessionStoreCollectionMap,
  toResourceIdentifierObj,
  toResourceIdentifierStr,
} from '@matterio/core-util';
import {
  SessionResource,
  UnknwownSessionResourceCollectionMap,
  AnySessionResourceCollectionMap,
  FragmentsByPath,
} from './types';
import immutableObjectPath from 'object-path-immutable';

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
              toResourceIdentifierStr(
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

  removeAllClients() {
    return this.getAllClients().flatMap((allClients) =>
      AsyncResult.all(
        ...allClients.map((client) => this.removeClient(client.id))
      )
    );
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
        item: this.toOutResource(resourceType, r.item),
      }));
  }

  updateResourceData<
    TResourceType extends SessionCollectionMapOfResourceKeys,
    TResourceData extends UnidentifiableModel<
      SessionCollectionMap[TResourceType]['data']
    >
  >(
    rId: ResourceIdentifier<TResourceType>,
    dataGetter:
      | Partial<TResourceData>
      | ((prev: TResourceData) => Partial<TResourceData>)
  ) {
    const { resourceId, resourceType } = toResourceIdentifierObj(rId);

    return this.store
      .updateItemInCollection(
        resourceType,
        resourceId,
        (prev) => {
          // TODO: This is like this b/c it needs to load the prev since the store doesn't
          //  merge partials of second or more generations. TODO: this could be set though
          // in order to save a redis trip to read the prev!
          return {
            ...prev,
            data: {
              // TODO: Add a test here!
              ...prev.data,
              ...(typeof dataGetter === 'function'
                ? dataGetter(prev.data as TResourceData)
                : dataGetter),
            },
          };
        },

        {
          foreignKeys: {} as any,
        }
      )
      .map((r) => this.toOutResource(resourceType, r));
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

  /**
   *
   * @param rId
   * @param forClientId: Optional for retrieving a Private resource with the Private Fragments applied
   * @returns
   */
  getResource<TResourceType extends SessionCollectionMapOfResourceKeys>(
    rId: ResourceIdentifier<TResourceType>,
    forClientId?: SessionClient['id']
  ) {
    const { resourceId, resourceType } = toResourceIdentifierObj(rId);

    return this.store
      .getItemInCollection(resourceType, resourceId)
      .map((r) => this.toOutResource(resourceType, r, forClientId));
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
    rId: ResourceIdentifier<TResourceType>
  ) {
    const now = new Date().getTime();

    return this.updateResourceSubscribers(rId, (prev) => ({
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
              [toResourceIdentifierStr(rId)]: {
                subscribedAt: now,
              },
            },
          }))
        )
      )
      .map(([resource, client]) => ({
        resource: this.toOutResource(
          toResourceIdentifierObj(rId).resourceType,
          resource
        ),
        client,
      }));
    // .flatMap(() => {
    // TODO: Revert the resource subscription in case of a client error
    // This is done this way to save a query of getting the client first!
    //  since we already get it when we call updateClient
    // .flatMapErr(() => {
    // })
  }

  private updateResourceSubscribers<
    TResourceType extends SessionCollectionMapOfResourceKeys
  >(
    rId: ResourceIdentifier<TResourceType>,
    updateFn: (
      prev: SessionResource['subscribers']
    ) => SessionResource['subscribers']
  ) {
    const { resourceId, resourceType } = toResourceIdentifierObj(rId);

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
  >(clientId: SessionClient['id'], rId: ResourceIdentifier<TResourceType>) {
    return this.getClient(clientId) // Remove in favor of an optimized read
      .flatMap((client) => {
        // TODO: This MUST BE a transaction!!!
        return this.removeResourceSubscriber(client.id, rId).flatMap(
          (nextResource) =>
            AsyncResult.all(
              new AsyncOk(nextResource),
              this.removeClientSubscription(clientId, rId)
            )
        );
      })
      .map(([resource, client]) => ({
        resource: this.toOutResource(
          toResourceIdentifierObj(rId).resourceType,
          resource
        ),
        client,
      }));
  }

  private removeResourceSubscriber<
    TResourceType extends SessionCollectionMapOfResourceKeys
  >(clientId: SessionClient['id'], rId: ResourceIdentifier<TResourceType>) {
    return this.updateResourceSubscribers(
      rId,
      ({ [clientId]: _, ...remainingSubscribers }) => remainingSubscribers
    );
  }

  private removeClientSubscription<
    TResourceType extends SessionCollectionMapOfResourceKeys
  >(clientId: SessionClient['id'], rId: ResourceIdentifier<TResourceType>) {
    return this.updateClient(clientId, (prev) => {
      const {
        [toResourceIdentifierStr(rId)]: removed,
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

  removeResource<TResourceType extends SessionCollectionMapOfResourceKeys>(
    rId: ResourceIdentifier<TResourceType>
  ) {
    // This should be a TRANSACTION
    return this.getResource(rId).flatMap((prevResource) => {
      const { resourceId, resourceType } = toResourceIdentifierObj(rId);

      return AsyncResult.all(
        // TODO: Optimization: This could be batched at Redis level
        ...objectKeys(prevResource.subscribers).map((cliendId) =>
          this.removeClientSubscription(cliendId, rId)
        )
      )
        .flatMap(() =>
          this.store.removeItemInCollection(resourceType as string, resourceId)
        )
        .map((removedResource) => ({
          ...removedResource,
          item: {
            resourceType,
            resourceId,
            subscribers: prevResource.subscribers,
          },
        }));
    });
  }

  private toOutResource = <
    TResourceType extends SessionCollectionMapOfResourceKeys
  >(
    type: TResourceType,
    r: SessionCollectionMap[TResourceType],
    forClientId?: SessionClient['id']
  ) => {
    // Apply the private fragments for the given client
    const itemData: SessionCollectionMap[TResourceType]['data'] = invoke(() => {
      const clientPrivateFragments = forClientId
        ? r.fragments?.[forClientId]
        : undefined;

      if (!clientPrivateFragments) {
        return r.data;
      }

      return SessionStore.applyFragmentsToResource(
        r.data,
        clientPrivateFragments
      );

      // // Apply the fragments
      // return objectKeys(clientPrivateFragments).reduce(
      //   (prev, nextFragmentPathStr) =>
      //     immutableObjectPath.merge(
      //       prev,
      //       nextFragmentPathStr,
      //       clientPrivateFragments[nextFragmentPathStr]
      //     ),
      //   publicItem
      // );
    });

    return {
      type,
      id: r.id,
      subscribers: r.subscribers,
      item: {
        id: r.id,
        ...itemData,
      },
    };
  };

  private static applyFragmentsToResource = <
    TResourceData extends UnknownRecord
  >(
    resourceData: TResourceData,
    fragments: FragmentsByPath<TResourceData>
  ): TResourceData => {
    // Apply the fragments
    return objectKeys(fragments).reduce(
      (prev, nextFragmentPathStr) =>
        immutableObjectPath.merge(
          prev,
          nextFragmentPathStr,
          fragments[nextFragmentPathStr]
        ),
      resourceData
    ) as TResourceData;
  };

  // private applyPrivateFragmentsToResourceItem() => {

  // }

  addResourceFragment<
    TResourceType extends SessionCollectionMapOfResourceKeys,
    TPath extends NestedObjectUtil.PathsTuple<
      ResourceCollectionMap[TResourceType]['data']
    >
  >(
    clientId: SessionClient['id'],
    rId: ResourceIdentifier<TResourceType>,
    path: TPath,
    privateFragment: Partial<
      NestedObjectUtil.DeepIndex<
        ResourceCollectionMap[TResourceType]['data'],
        TPath
      >
    >,
    publicFragment?: Partial<
      NestedObjectUtil.DeepIndex<
        ResourceCollectionMap[TResourceType]['data'],
        TPath
      >
    >
  ) {
    return this.updateResourceFragments(
      clientId,
      rId,
      path,
      privateFragment,
      publicFragment
    ).map(() => undefined);
  }

  private updateResourceFragments<
    TResourceType extends SessionCollectionMapOfResourceKeys,
    TPath extends NestedObjectUtil.PathsTuple<
      ResourceCollectionMap[TResourceType]['data']
    >
  >(
    clientId: SessionClient['id'],
    rId: ResourceIdentifier<TResourceType>,
    path: TPath,
    privateFragment: Partial<
      NestedObjectUtil.DeepIndex<
        ResourceCollectionMap[TResourceType]['data'],
        TPath
      >
    >,
    publicFragment?: Partial<
      NestedObjectUtil.DeepIndex<
        ResourceCollectionMap[TResourceType]['data'],
        TPath
      >
    >
  ) {
    const pathStr = path.join('.');

    return this.updateResource(rId, (prev) => ({
      // This could be called with an APPEND flag so it solves the double trip
      ...prev,

      // If there is a publicFragment given, set it
      ...(publicFragment && {
        data: {
          ...prev.data,
          ...SessionStore.applyFragmentsToResource(prev.data, {
            [pathStr]: publicFragment,
          }),
        },
      }),
      fragments: {
        ...prev.fragments,
        [clientId]: {
          [pathStr]: privateFragment,
        },
      },
    }));
  }

  /**
   * This Reconciles all the fragments present and deletes them
   *
   * @param rId
   * @returns The Public Resource after all the fragments have been applied!
   */
  reconcileResourceFragments<
    TResourceType extends SessionCollectionMapOfResourceKeys
  >(rId: ResourceIdentifier<TResourceType>) {
    return this.updateResource(rId, (prev) => {
      const { fragments } = prev;

      if (!fragments) {
        return prev;
      }

      // TODO: Do we need an order for the fragments by client? Probably!
      // Iterate over all the fragments by ClientId
      return objectKeys(fragments).reduce((accum, clientId) => {
        return {
          ...accum,
          data: {
            ...accum.data,
            ...SessionStore.applyFragmentsToResource(
              accum.data,
              fragments[clientId]
            ),
          },
          // Remove the fragments once it is applied!
          fragments: undefined,
        };
      }, prev);
    });
  }

  private updateResource<
    TResourceType extends SessionCollectionMapOfResourceKeys,
    TResource extends SessionCollectionMap[TResourceType]
  >(
    rId: ResourceIdentifier<TResourceType>,
    next: Partial<TResource> | ((prev: TResource) => Partial<TResource>)
  ) {
    const { resourceId, resourceType } = toResourceIdentifierObj(rId);

    return this.store
      .updateItemInCollection(
        resourceType,
        resourceId,
        next as any,
        {
          foreignKeys: {}, // TODO: This guy needs to be given from outside
        } as any // TODO: Can I fix this any?
      )
      .map((r) => this.toOutResource(resourceType, r))
      .mapErr(toSessionError);
  }
}
