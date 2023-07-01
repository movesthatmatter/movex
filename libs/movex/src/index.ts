export * from './lib';
export * from './lib/master/MovexMasterServer';
export * from './lib/movex-store';
export * from './lib/io-connection/io-events';
export * from './lib/public-types';

// @deprecated
export * as Client from './lib/client';
export * as Master from './lib/master';

// Aliased
export * as MovexClient from './lib/client';
export * as MovexMaster from './lib/master';
export * as MovexMasterLocal from './lib/master-local';

export {
  ResourceIdentifier,
  ResourceIdentifierObj,
  ResourceIdentifierStr,
  AnyResourceIdentifier,
  toResourceIdentifierObj as toRidAsObj,
  toResourceIdentifierStr as toRidAsStr,
} from 'movex-core-util';
