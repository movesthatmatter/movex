import * as RRStore from 'relational-redis-store';
import { CollectionMapBase } from 'relational-redis-store';
import { Resource, Topic } from '../types';

export type EmptyCollectionStoreOptions = {
  foreignKeys: {};
};

// export type RawActivity = Activity<string> & {

// }

// export type ActivityRawId = `activity:${string}:${string}`;

export type ResourceIdentifier<TResourceType extends keyof CollectionMapBase> = {
  resourceType: TResourceType;
  resourceId: Resource['id'];
};

export type ResourceIdentifierString<
  TResourceType extends keyof CollectionMapBase
> = `${TResourceType}:${Resource['id']}`;
