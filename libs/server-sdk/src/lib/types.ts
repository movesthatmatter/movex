import { WsResponse } from '@nestjs/websockets';

export type WsResponseResultPayload<T, E> =
  | {
      ok: true;
      err: false;
      val: T;
    }
  | {
      ok: false;
      err: true;
      val: E;
    };

export type WsResponseAsResult<T, E> = WsResponse<
  WsResponseResultPayload<T, E>
>;

import * as RRStore from 'relational-redis-store';
import { CollectionMapBase } from 'relational-redis-store';

export type UnknownRecord = Record<string, unknown>;

type SessionResourceType = string;

export type SessionClient<Info extends UnknownRecord = {}> = {
  id: string;
  info?: Info; // User Info or whatever
  subscriptions: Record<
    `${SessionResourceType}:${SessionResource['id']}`,
    {
      // resourceType: string; // TODO: This could be part of the resource id
      subscribedAt: number;
    }
  >;

  // TODO: Add later on
  // lag: number;
  // createdAt: number;
  // upadtedAt: number;
  // lastPingAt: mumber;
  // status: 'idle' | 'active' | etc..
};

// export type Topic<TUniqueName extends string> = {
//   id: TUniqueName;
//   subscribers: Record<SessionClient['id'], null>; // Here it could use the full Peer?
// };

type CollectionMapBaseItem = RRStore.CollectionMapBase[any];

export type SessionResource<TData extends UnknownRecord = {}> =
  CollectionMapBaseItem & {
    id: string;
    data: TData;
    subscribers: Record<
      SessionClient['id'],
      {
        subscribedAt: number;
      }
    >;
  };

// export type ObservableResource<TData extends UnknownRecord = {}> =
// Resource<TData> & {
//   topic: Topic<string>['id'];
// };

export type ResourceIdentifier<TResourceType extends string> = {
  resourceType: TResourceType;
  resourceId: SessionResource['id'];
};

export type ResourceIdentifierString<TResourceType extends string> =
  `${TResourceType}:${SessionResource['id']}`;

export type StringKeys<TRecord extends UnknownRecord> = Extract<
  keyof TRecord,
  string
>;

export type UnknwownSessionResourceCollectionMap = Record<
  string,
  SessionResource<UnknownRecord>
>;

export type AnySessionResourceCollectionMap = Record<
  string,
  SessionResource<any>
>;

// TODO: Rename to session collection map
export type SessionStoreCollectionMap<
  ResourcesCollectionMap extends CollectionMapBase
> = {
  $clients: SessionClient;
  // $topics: Topic<string>;
} & ResourcesCollectionMap;

// This extracts out the $clients and other possible private keys
export type OnlySessionCollectionMapOfResourceKeys<
  ResourceCollectionMap extends UnknwownSessionResourceCollectionMap,
  SessionCollectionMap = SessionStoreCollectionMap<ResourceCollectionMap>
> = StringKeys<Omit<SessionCollectionMap, keyof SessionStoreCollectionMap<{}>>>;
