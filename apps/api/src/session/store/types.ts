import { CollectionMapBase } from 'relational-redis-store';
import { SessionResource } from '../types';

export type EmptyCollectionStoreOptions = {
  foreignKeys: {};
};

// export type RawActivity = Activity<string> & {

// }

// export type ActivityRawId = `activity:${string}:${string}`;

export type ResourceIdentifier<TResourceType extends keyof CollectionMapBase> = {
  resourceType: TResourceType;
  resourceId: SessionResource['id'];
};

export type ResourceIdentifierString<
  TResourceType extends keyof CollectionMapBase
> = `${TResourceType}:${SessionResource['id']}`;
