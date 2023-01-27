export interface WsResponse<T = any> {
  event: string;
  data: T;
}

export declare type UnidentifiableModel<T extends {}> = Omit<T, 'id'>;

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

export type CollectionMapBase = {
  [key: string]: {
    id: string;
  } & object;
};

export type UnknownRecord = Record<string, unknown>;

export type UnknownIdentifiableRecord = { id: string } & Record<
  string,
  unknown
>;
export type AnyIdentifiableRecord = { id: string } & Record<string, any>;

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

// type CollectionMapBaseItem = RRStore.CollectionMapBase[any];

export type SessionResource<TData extends UnknownRecord = {}> = {
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

export type WaitingMatch = {
  id: string;
  status: 'waiting'; // waiting for players
  playerCount: number;
  // waitTime:
  players: Record<SessionClient['id'], undefined>;
  matcher: string; // this is the matcher pattern: "chess" or "chess:5min" or "chess:5min:white", the more items the more limiting/accurate to match
};

// Need to rename the "Session"
export type SessionMatch = WaitingMatch;

export type NativeResourceCollectionMap = {
  $matches: SessionMatch;
};

// TODO: Rename to session collection map
export type SessionStoreCollectionMap<
  ResourcesCollectionMap extends CollectionMapBase
> = {
  $clients: SessionClient;
  // $topics: Topic<string>;
} & NativeResourceCollectionMap &
  ResourcesCollectionMap;

// This extracts out the $clients and other possible private keys
export type OnlySessionCollectionMapOfResourceKeys<
  ResourceCollectionMap extends CollectionMapBase,
  SessionCollectionMap = SessionStoreCollectionMap<ResourceCollectionMap>
> = StringKeys<Omit<SessionCollectionMap, keyof SessionStoreCollectionMap<{}>>>;

export type ResourceResponse<
  ResourceCollectionMap extends Record<string, UnknownIdentifiableRecord>,
  TResourceType extends keyof ResourceCollectionMap
  // SessionCollectionMapOfResourceKeys extends OnlySessionCollectionMapOfResourceKeys<ResourceCollectionMap> = OnlySessionCollectionMapOfResourceKeys<ResourceCollectionMap>
> = {
  type: TResourceType;
  item: ResourceCollectionMap[TResourceType];
  subscribers: SessionResource['subscribers'];
};

export type ResourceClientResponse<
  ResourceCollectionMap extends Record<string, UnknownIdentifiableRecord>,
  TResourceType extends keyof ResourceCollectionMap
  // SessionCollectionMapOfResourceKeys extends OnlySessionCollectionMapOfResourceKeys<ResourceCollectionMap> = OnlySessionCollectionMapOfResourceKeys<ResourceCollectionMap>
> = {
  type: TResourceType;
  item: ResourceCollectionMap[TResourceType];
};
