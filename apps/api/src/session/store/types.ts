import { SessionResource } from '../types';

export type EmptyCollectionStoreOptions = {
  foreignKeys: {};
};

export type ResourceIdentifier<TResourceType extends string> = {
  resourceType: TResourceType;
  resourceId: SessionResource['id'];
};

export type ResourceIdentifierString<TResourceType extends string> =
  `${TResourceType}:${SessionResource['id']}`;
