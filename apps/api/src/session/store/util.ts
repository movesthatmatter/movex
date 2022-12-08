import { CollectionMapBase } from 'relational-redis-store';
import * as uuid from 'uuid';
import { ResourceIdentifier, ResourceIdentifierString } from './types';

export const getUuid = () => uuid.v4();

export const toResourceIdentifier = <
  TResourceType extends keyof CollectionMapBase
>(
  r: ResourceIdentifier<TResourceType> | ResourceIdentifierString<TResourceType>
): ResourceIdentifier<TResourceType> => {
  if (typeof r === 'string') {
    const resourceType = r.slice(0, r.indexOf(':')) as TResourceType;
    const resourceId = r.slice(r.indexOf(':') + 1);

    return {
      resourceType,
      resourceId,
    };
  }

  return r;
};
