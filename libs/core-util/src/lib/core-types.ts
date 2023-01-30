export interface WsResponse<T = any> {
  event: string;
  data: T;
}

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

export type UnidentifiableModel<T extends {}> = Omit<T, 'id'>;

type GenericSessionResourceType = string;

export type SessionClient<Info extends UnknownRecord = {}> = {
  id: string;
  info?: Info; // User Info or whatever
  subscriptions: Record<
    `${GenericSessionResourceType}:${SessionResource['id']}`,
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

export type PlayerIdentifier = SessionClient['id'];

export type BaseMatch<TGame extends UnknownRecord = UnknownRecord> = {
  id: string;
  playerCount: number;
  // waitTime:
  players: Record<PlayerIdentifier, undefined>;
  matcher: string; // this is the matcher pattern: "chess" or "chess:5min" or "chess:5min:white", the more items the more limiting/accurate to match
  game: TGame;
};

export type WaitingMatch<TGame extends UnknownRecord = UnknownRecord> =
  BaseMatch<TGame> & {
    status: 'waiting'; // waiting for players
    winner: undefined;
  };

export type InProgressMatch<TGame extends UnknownRecord = UnknownRecord> =
  BaseMatch<TGame> & {
    status: 'inProgress'; // waiting for players
    winner: undefined;
  };

export type CompletedMatch<TGame extends UnknownRecord = UnknownRecord> =
  BaseMatch<TGame> & {
    status: 'completed'; // waiting for players
    winner: PlayerIdentifier;
  };

// Need to rename the "Session"
export type SessionMatch<TGame extends UnknownRecord = UnknownRecord> =
  | WaitingMatch<TGame>
  | InProgressMatch<TGame>
  | CompletedMatch<TGame>;

export type NativeResourceCollectionMap<
  TGame extends UnknownRecord = UnknownRecord
> = {
  $matches: SessionMatch<TGame>;
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

export type CreateMatchReq<TGame extends UnknownRecord> = {
  matcher: SessionMatch['matcher'];
  playerCount: SessionMatch['playerCount'];
  players?: SessionClient['id'][];
  game: TGame
};
