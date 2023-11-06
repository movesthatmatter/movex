export * from './lib';
// export * from '../../movex-master/src/lib/MovexMasterServer';
// export * from '../../movex-store/src/lib';
// export * from '../../movex-core-util/src/lib/public-types';

// @deprecated
export * as Client from './lib/client';
// export * as Master from '../../movex-master/src/lib';

// Aliased
export * as MovexClient from './lib/client';
// export * as MovexMaster from '../../movex-master/src/lib';
// export * as MovexMasterLocal from './lib/master-local';

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
} from '@movex/movex-core-util';
