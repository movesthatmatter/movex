import { SessionStore } from './store';
import { getUuid } from './store/util';

// export


// The store gives us the basic blocks (peer/subscriber, resource, observableResource and topic)
// while the Session is the abstraction of that

export class Session extends SessionStore {
  // Activity

  // static toActivityRawId = (type: string, id: string) =>
  //   `activity:${type}:${id}`;
  // static fromActivityRawId = (id: ActivityRawId) => ({
  //   type: id.slice(id.indexOf(':'), id.lastIndexOf(':') + 1),
  //   id: id.slice(id.lastIndexOf(':')),
  // });

  // static getUUID = getUuid;

  // createActivity<TType extends string>(
  //   type: TType,
  //   info?: Activity<TType>['info']
  // ) {
  //   const newId = SessionStore.getUUID();
  //   // TODO: This must be generic
  //   return this.createTopic(SessionStore.toActivityRawId(type, newId)).flatMap(
  //     (topic) => {
  //       // topic.item.
  //       return this.store.addItemToCollection(
  //         'activities',
  //         {
  //           type,
  //           info,
  //           topic: topic.item.id,
  //         },
  //         newId,
  //         ACTIVITIES_COLLECTION_STORE_OPTIONS
  //       );
  //     }
  //   );
  // }

  // all() {
  //   // this.store.redisClient.ke()
  // } 
}
