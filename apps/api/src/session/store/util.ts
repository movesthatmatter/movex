import { ResourceIdentifier, ResourceIdentifierString } from '@mtm/server-sdk';
import * as uuid from 'uuid';

export const getUuid = () => uuid.v4();

export const toResourceIdentifier = <TResourceType extends string>(
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
