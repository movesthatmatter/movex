// import * as uuid from 'uuid';
// import * as RRStore from 'relational-redis-store';
// import { Peer, Topic } from '../types';
// import { ISessionStore } from './ISessionStore';
// import { AsyncOk, AsyncResult } from 'ts-async-results';
// import { toSessionError } from './SessionStoreErrors';

// // Note:
// // This is currently depending on RRStore, but from what I see
// // there's not much need for it, and in some situations it can
// // add complications. In the future this can be rewritten to
// // use bar redis functions, or another redis store could be written
// // just for this. Some issues I see are:
// //   - nesting the subscribers and subscriptions inside the object, 
// //     but maybe that's not that bad actually :-/

// type CollectionMap = {
//   peers: Peer;
//   topics: Topic<string>;
// };

// const getUuid = () => uuid.v4();

// const PEERS_COLLECTION_STORE_OPTIONS = {
//   foreignKeys: {},
// };

// const TOPICS_COLLECTION_STORE_OPTIONS = {
//   foreignKeys: {},
// };

// type UpdateableTopicProps = RRStore.CollectionItemUpdateableProps<
//   Topic<string>,
//   CollectionMap,
//   typeof TOPICS_COLLECTION_STORE_OPTIONS['foreignKeys']
// >;

// type UpdateableTopicPropsGetter =
//   | UpdateableTopicProps
//   | ((
//       prev: RRStore.CollectionItemUpdateablePrev<
//         Topic<string>,
//         CollectionMap,
//         typeof TOPICS_COLLECTION_STORE_OPTIONS['foreignKeys']
//       >
//     ) => UpdateableTopicProps);

// type UpdateablePeerProps = RRStore.CollectionItemUpdateableProps<
//   Peer,
//   CollectionMap,
//   typeof PEERS_COLLECTION_STORE_OPTIONS['foreignKeys']
// >;

// type UpdateablePeerPropsGetter =
//   | UpdateablePeerProps
//   | ((
//       prev: RRStore.CollectionItemUpdateablePrev<
//         Peer,
//         CollectionMap,
//         typeof PEERS_COLLECTION_STORE_OPTIONS['foreignKeys']
//       >
//     ) => UpdateablePeerProps);

// export class SessionStore implements ISessionStore {
//   constructor(private store: RRStore.Store<CollectionMap>) {}

//   // Peer

//   createPeer(p?: { id?: string; info?: {} }) {
//     return this.store
//       .addItemToCollection(
//         'peers',
//         {
//           info: p?.info,
//           subscriptions: {},
//         },
//         p?.id || getUuid(),
//         PEERS_COLLECTION_STORE_OPTIONS
//       )
//       .mapErr(toSessionError);
//   }

//   getPeer(id: Peer['id']) {
//     return this.store.getItemInCollection('peers', id).mapErr(toSessionError);
//   }

//   getPeers(ids: Peer['id'][]) {
//     return this.store.getItemsInCollection('peers', ids).mapErr(toSessionError);
//   }

//   getAllPeers() {
//     return this.store.getAllItemsInCollection('peers').mapErr(toSessionError);
//   }

//   updatePeer(id: Peer['id'], propsGetter: UpdateablePeerPropsGetter) {
//     return this.store
//       .updateItemInCollection(
//         'peers',
//         id,
//         propsGetter,
//         PEERS_COLLECTION_STORE_OPTIONS
//       )
//       .mapErr(toSessionError);
//   }

//   removePeer(id: string) {
//     return this.store
//       .removeItemInCollection('peers', id)
//       .mapErr(toSessionError);
//   }

//   // Topic

//   createTopic<TName extends string>(uniqName: TName) {
//     return this.store
//       .addItemToCollection(
//         'topics',
//         { subscribers: {} },
//         uniqName,
//         TOPICS_COLLECTION_STORE_OPTIONS
//       )
//       .map((s) => s as RRStore.CollectionItemOrReply<Topic<TName>>)
//       .mapErr(toSessionError);
//   }

//   getTopic<TTopic extends string>(topic: TTopic) {
//     return this.store.getItemInCollection('topics', topic);
//   }

//   private updateTopicSubscribers<TName extends string>(
//     name: TName,
//     propsGetter: UpdateableTopicPropsGetter
//   ) {
//     return this.store
//       .updateItemInCollection(
//         'topics',
//         name,
//         propsGetter,
//         TOPICS_COLLECTION_STORE_OPTIONS
//       )
//       .map((t) => t as Topic<TName>)
//       .mapErr(toSessionError);
//   }

//   // Subscriptions

//   subscribeToTopic<TTopicName extends string>(
//     name: TTopicName,
//     peerId: Peer['id']
//   ) {
//     return this.getPeer(peerId)
//       .flatMap((peer) => {
//         // TODO: This MUST BE a transaction!!!
//         return this.updateTopicSubscribers(name, (prev) => ({
//           ...prev,
//           subscribers: {
//             ...prev.subscribers,
//             [peer.id]: null,
//           },
//         })).flatMap((updatedTopic) =>
//           AsyncResult.all(
//             new AsyncOk(updatedTopic),
//             this.updatePeer(peerId, (prev) => ({
//               ...prev,
//               subscriptions: {
//                 ...prev.subscriptions,
//                 [updatedTopic.id]: null,
//               },
//             }))
//           )
//         );
//       })
//       .map(([topic, peer]) => ({
//         topic,
//         peer,
//       }));
//   }

//   unsubscribeFromTopic<TTopicName extends string>(
//     name: TTopicName,
//     peerId: Peer['id']
//   ) {
//     return this.getPeer(peerId)
//       .flatMap((peer) => {
//         // TODO: This MUST BE a transaction!!!
//         return this.updateTopicSubscribers(name, (prev) => {
//           const { [peer.id]: removed, ...nextSubscribers } = prev.subscribers;

//           return {
//             ...prev,
//             subscribers: nextSubscribers,
//           };
//         }).flatMap((updatedTopic) =>
//           AsyncResult.all(
//             new AsyncOk(updatedTopic),
//             this.updatePeer(peerId, (prev) => {
//               const { [updatedTopic.id]: removed, ...nextSubscriptions } =
//                 prev.subscriptions;

//               return {
//                 ...prev,
//                 subscriptions: nextSubscriptions,
//               };
//             })
//           )
//         );
//       })
//       .map(([topic, peer]) => ({
//         topic,
//         peer,
//       }));
//   }

//   getTopicSubscribers<TTopic extends string>(topic: TTopic) {
//     return this.getTopic(topic)
//       .flatMap((topic) => {
//         return this.store.getItemsInCollection(
//           'peers',
//           Object.keys(topic.subscribers)
//         );
//       })
//       .mapErr(toSessionError);
//   }

//   getPeerSubscriptions(peerId: Peer['id']) {
//     return this.getPeer(peerId).flatMap((peer) => {
//       return this.store
//         .getItemsInCollection('topics', Object.keys(peer.subscriptions))
//         .mapErr(toSessionError);
//     });
//   }
// }
