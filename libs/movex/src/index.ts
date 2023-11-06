export * from './lib';

// Aliased
export * as MovexClient from './lib/client';

export {
  type ResourceIdentifier,
  type ResourceIdentifierObj,
  type ResourceIdentifierStr,
  type AnyResourceIdentifier,
  toResourceIdentifierObj as toRidAsObj,
  toResourceIdentifierStr as toRidAsStr,
  isResourceIdentifier as isRid,
  isResourceIdentifierOfType as isRidOfType,
  isSameResourceIdentifier as isSameRid,
} from 'movex-core-util';
