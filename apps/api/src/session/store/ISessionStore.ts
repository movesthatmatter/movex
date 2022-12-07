import * as RRStore from 'relational-redis-store';
import {
  CollectionItemOrReply,
  CollectionMapBase,
} from 'relational-redis-store';
import { AsyncResult } from 'ts-async-results';
import { Client, Resource, Topic } from '../types';
import {
  CraeteResourceError,
  CreatePeerError,
  CreateTopicError,
  GetPeerError,
  GetPeerSubscriptionsError,
  GetTopicSubscribersError,
  RemovePeerError,
  SubscribeToTopicError,
  UnsubscribeToTopicError,
} from './SessionStoreErrors';

export type SessionStoreCollectionMap<
  ResourcesCollectionMap extends CollectionMapBase
> = {
  $clients: Client;
  // $topics: Topic<string>;
} & ResourcesCollectionMap;

export interface ISessionStore<
  CollectionMap extends SessionStoreCollectionMap<{}>
> {
  // <
  //   TCustomCollectionMap extends RRStore.CollectionMapBase,
  //   TCollectionMap = TCustomCollectionMap & SessionStoreCollectionMap
  // >
  // Peer
  createClient(p?: {
    id?: Client['id']; // Given ID to replace the generating one
    info?: Client['info'];
  }): AsyncResult<RRStore.CollectionItemOrReply<Client>, CreatePeerError>;

  getClient(id: Client['id']): AsyncResult<Client, GetPeerError>;

  getClients(id: Client['id'][]): AsyncResult<Client[], GetPeerError>;

  removeClient(
    id: Client['id']
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
