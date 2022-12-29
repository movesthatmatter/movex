import * as RRStore from 'relational-redis-store';
import { CollectionMapBase } from 'relational-redis-store';
import { AsyncResult } from 'ts-async-results';
import { SessionClient } from '../types';
import { SessionStore } from './SessionStore';
import {
  CreatePeerError,
  GetPeerError,
  RemovePeerError,
} from './SessionStoreErrors';

export type SessionStoreCollectionMap<
  ResourcesCollectionMap extends CollectionMapBase
> = {
  $clients: SessionClient;
  // $topics: Topic<string>;
} & ResourcesCollectionMap;

export type ISesh = typeof SessionStore;

export interface ISessionStore<
  CollectionMap extends SessionStoreCollectionMap<{}>
> {
  // <
  //   TCustomCollectionMap extends RRStore.CollectionMapBase,
  //   TCollectionMap = TCustomCollectionMap & SessionStoreCollectionMap
  // >
  // Peer
  createClient(p?: {
    id?: SessionClient['id']; // Given ID to replace the generating one
    info?: SessionClient['info'];
  }): AsyncResult<RRStore.CollectionItemOrReply<SessionClient>, CreatePeerError>;

  getClient(id: SessionClient['id']): AsyncResult<SessionClient, GetPeerError>;

  getClients(id: SessionClient['id'][]): AsyncResult<SessionClient[], GetPeerError>;

  removeClient(
    id: SessionClient['id']
  ): AsyncResult<RRStore.CollectionItemRemovalReply, RemovePeerError>;

  // Topic
  // createTopic<TName extends string>(
  //   name: TName
  // ): AsyncResult<RRStore.CollectionItemOrReply<Topic<TName>>, CreateTopicError>;

  // subscribeToTopic<TTopicName extends string>(
  //   name: TTopicName,
  //   peerId: Peer['id']
  // ): AsyncResult<
  //   { topic: Topic<TTopicName>; peer: Peer },
  //   SubscribeToTopicError
  // >;

  // unsubscribeFromTopic<TTopicName extends string>(
  //   name: TTopicName,
  //   peerId: Peer['id']
  // ): AsyncResult<
  //   { topic: Topic<TTopicName>; peer: Peer },
  //   UnsubscribeToTopicError
  // >;

  // getTopicSubscribers<TTopic extends string>(
  //   topic: TTopic
  // ): AsyncResult<Peer[], GetTopicSubscribersError>;

  // getPeerSubscriptions(
  //   peerId: Peer['id']
  // ): AsyncResult<Topic<string>[], GetPeerSubscriptionsError>;

  // removeTopic<TName extends string>(name: TName): AsyncResult<void, void>; // TODO: Add better error type

  // (Observable) Resources

  // createResource<TData extends Resource['data']>(
  //   resourceType
  //   data: TData
  // ): AsyncResult<CollectionItemOrReply<TData>, CraeteResourceError>;

  // createObservableResource<TData extends Resource['data']>(
  //   data: TData
  // ): AsyncResult<Resource, CraeteResourceError>;

  // // This works for both – if the resource happens to be observable
  // //  it will automatically publish updates to
  // updateResource<TData extends Resource['data']>(
  //   id: Resource['id'],
  //   data: RRStore.UpdateableCollectionPropsGetter<TData>
  // ): AsyncResult<Resource, CraeteResourceError>;

  // Activity
  // createActivity<TType extends string>(type: TType): AsyncResult<{
  //   id:
  //   type: TType;
  // }>

  // TODO Add Events
}
