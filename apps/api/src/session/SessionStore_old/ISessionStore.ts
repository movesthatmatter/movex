// import * as RRStore from 'relational-redis-store';
// import { AsyncResult } from 'ts-async-results';
// import { Peer, Topic } from '../types';
// import {
//   CreatePeerError,
//   CreateTopicError,
//   GetPeerError,
//   GetPeerSubscriptions,
//   GetTopicSubscribersError,
//   RemovePeerError,
//   SubscribeToTopicError,
//   UnsubscribeToTopicError,
// } from './SessionStoreErrors';

// export interface ISessionStore {
//   // Peer
//   createPeer(p?: {
//     id?: Peer['id']; // Given ID to replace the generating one
//     info?: Peer['info'];
//   }): AsyncResult<RRStore.CollectionItemOrReply<Peer>, CreatePeerError>;

//   getPeer(id: Peer['id']): AsyncResult<Peer, GetPeerError>;

//   getPeers(id: Peer['id'][]): AsyncResult<Peer[], GetPeerError>;

//   removePeer(
//     id: Peer['id']
//   ): AsyncResult<RRStore.CollectionItemRemovalReply, RemovePeerError>;

//   // Topic
//   createTopic<TName extends string>(
//     name: TName
//   ): AsyncResult<RRStore.CollectionItemOrReply<Topic<TName>>, CreateTopicError>;

//   subscribeToTopic<TTopicName extends string>(
//     name: TTopicName,
//     peerId: Peer['id']
//   ): AsyncResult<
//     { topic: Topic<TTopicName>; peer: Peer },
//     SubscribeToTopicError
//   >;

//   unsubscribeFromTopic<TTopicName extends string>(
//     name: TTopicName,
//     peerId: Peer['id']
//   ): AsyncResult<
//     { topic: Topic<TTopicName>; peer: Peer },
//     UnsubscribeToTopicError
//   >;

//   getTopicSubscribers<TTopic extends string>(
//     topic: TTopic
//   ): AsyncResult<Peer[], GetTopicSubscribersError>;

//   getPeerSubscriptions(
//     peerId: Peer['id']
//   ): AsyncResult<Topic<string>[], GetPeerSubscriptions>;

//   // removeTopic<TName extends string>(name: TName): AsyncResult<void, void>; // TODO: Add better error type

//   // Activity
//   // createActivity<TType extends string>(type: TType): AsyncResult<{
//   //   id:
//   //   type: TType;
//   // }>

//   // TODO Add Events
// }
