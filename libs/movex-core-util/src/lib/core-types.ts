import { UnknownRecord } from './core-util';

export namespace NestedObjectUtil {
  // The Paths Types is taken from https://stackoverflow.com/a/58436959/2093626

  type Prev = [
    never,
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20,
    ...0[]
  ];

  type Join<K, P> = K extends string | number
    ? P extends string | number
      ? `${K}${'' extends P ? '' : '.'}${P}`
      : never
    : never;

  // type Split<S extends string, D extends string> =
  //   string extends S ? string[] :
  //   S extends '' ? [] :
  //   S extends `${infer T}${D}${infer U}` ? [T, ...Split<U, D>] : [S];
  export type Keys = readonly PropertyKey[];

  export type Paths<T, D extends number = 10> = [D] extends [never]
    ? never
    : T extends object
    ? {
        [K in keyof T]-?: K extends string | number
          ? `${K}` | Join<K, Paths<T[K], Prev[D]>>
          : never;
      }[keyof T]
    : '';

  type Cons<H, T> = T extends readonly any[]
    ? ((h: H, ...t: T) => void) extends (...r: infer R) => void
      ? R
      : never
    : never;

  export type PathsTuple<T, D extends number = 10> = [D] extends [never]
    ? never
    : T extends object
    ? {
        [K in keyof T]-?:
          | [K]
          | (PathsTuple<T[K], Prev[D]> extends infer P
              ? P extends []
                ? never
                : Cons<K, P>
              : never);
      }[keyof T]
    : [];

  export type LeavesTuple<T, D extends number = 10> = [D] extends [never]
    ? never
    : T extends object
    ? { [K in keyof T]-?: Cons<K, LeavesTuple<T[K], Prev[D]>> }[keyof T]
    : [];
  // export type AtPath<T, P extends Paths<T, D>, D extends number = 10> = [D] extends [never]
  //   ? never
  //   : T extends object
  //   ? {
  //       [K in keyof T]-?: K extends string | number
  //         ? `${K}` | Join<K, Paths<T[K], Prev[D]>>
  //         : never;
  //     }[keyof T]
  //   : '';

  export type Leaves<T, D extends number = 10> = [D] extends [never]
    ? never
    : T extends object
    ? { [K in keyof T]-?: Join<K, Leaves<T[K], Prev[D]>> }[keyof T]
    : '';

  // The Deep index is taken from this amazin answer
  // https://stackoverflow.com/a/61648690/2093626
  export type DeepIndex<T, KS extends Keys, Fail = undefined> = KS extends [
    infer F,
    ...infer R
  ]
    ? F extends keyof T
      ? R extends Keys
        ? DeepIndex<T[F], R, Fail>
        : Fail
      : Fail
    : T;
}

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

export type UnknownIdentifiableRecord = { id: string } & Record<
  string,
  unknown
>;
export type AnyIdentifiableRecord = { id: string } & Record<string, any>;

export type UnidentifiableModel<T extends {}> = Omit<T, 'id'>;

// TODO: Remove all of these if not used

export type ResourceShape<
  TResourceType extends PropertyKey,
  TData extends UnknownRecord
> = {
  type: TResourceType;
  id: string;
  item: { id: string } & TData;
  subscribers: Record<
    MovexClient['id'],
    {
      subscribedAt: number;
    }
  >;
};

export type ClientResourceShape<
  TResourceType extends PropertyKey,
  TData extends UnknownRecord
> = Pick<ResourceShape<TResourceType, TData>, 'type' | 'id' | 'item'>;

export type Resource<
  ResourceCollectionMap extends Record<string, UnknownIdentifiableRecord>,
  TResourceType extends keyof ResourceCollectionMap
> = ResourceShape<TResourceType, ResourceCollectionMap[TResourceType]>;

export type ServerResource<
  ResourceCollectionMap extends Record<string, UnknownIdentifiableRecord>,
  TResourceType extends keyof ResourceCollectionMap
> = Resource<ResourceCollectionMap, TResourceType>;

export type ClientResource<
  ResourceCollectionMap extends Record<string, UnknownIdentifiableRecord>,
  TResourceType extends keyof ResourceCollectionMap
> = Pick<
  ServerResource<ResourceCollectionMap, TResourceType>,
  'item' | 'type' | 'id'
>;

export type GenericClientResource = ClientResource<
  Record<string, UnknownIdentifiableRecord>,
  keyof UnknownRecord
>;

export type GenericClientResourceShapeOfType<
  TResourceType extends PropertyKey
> = ClientResourceShape<TResourceType, UnknownRecord>;

export type GenericResource = Resource<
  Record<string, UnknownIdentifiableRecord>,
  keyof UnknownRecord
>;

export type GenericResourceOfType<TResourceType extends string> = Resource<
  Record<string, UnknownIdentifiableRecord>,
  TResourceType
>;

export type GenericResourceType = GenericResource['type'];

export type MovexClient<Info extends UnknownRecord = {}> = {
  id: string;
  info?: Info; // User Info or whatever
  subscriptions: Record<
    ResourceIdentifierStr<GenericResourceType>,
    {
      // resourceType: string; // TODO: This could be part of the resource id
      subscribedAt: number;
    }
  >;
};

export type ResourceIdentifierObj<TResourceType extends string> = {
  resourceType: TResourceType;
  resourceId: GenericResource['id'];
};

export type ResourceIdentifierStr<TResourceType extends string> =
  `${TResourceType}:${GenericResource['id']}`;

export type ResourceIdentifier<TResourceType extends string> =
  | ResourceIdentifierObj<TResourceType>
  | ResourceIdentifierStr<TResourceType>;

export type AnyResourceIdentifier = ResourceIdentifier<string>;

export type StringKeys<TRecord extends UnknownRecord> = Extract<
  keyof TRecord,
  string
>;

export type PlayerIdentifier = MovexClient['id'];

export type EmptyString = ``;

export type BaseMatch<TGame extends UnknownRecord = UnknownRecord> = {
  id: string;
  playersTotal: number;
  // waitTime:
  players: Record<PlayerIdentifier, true>;
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

// TODO Need to rename the "Session"
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
  $clients: MovexClient;
  // $topics: Topic<string>;
} & NativeResourceCollectionMap &
  ResourcesCollectionMap;

// This extracts out the $clients and other possible private keys
export type OnlySessionCollectionMapOfResourceKeys<
  ResourceCollectionMap extends CollectionMapBase,
  SessionCollectionMap = SessionStoreCollectionMap<ResourceCollectionMap>
> = StringKeys<Omit<SessionCollectionMap, keyof SessionStoreCollectionMap<{}>>>;

export type CreateMatchReq<TGame extends UnknownRecord> = {
  matcher: SessionMatch['matcher'];
  playersTotal: SessionMatch['playersTotal'];
  game: TGame;
  players?: MovexClient['id'][];
};

export type IOPayloadResultOk<T> = {
  ok: true;
  err: false;
  val: T;
};

export type IOPayloadResultErr<E> = {
  ok: false;
  err: true;
  val: E;
};

export type IOPayloadResult<T, E> =
  | IOPayloadResultOk<T>
  | IOPayloadResultErr<E>;

export type IOPayloadResultOkType<T extends IOPayloadResult<any, any>> =
  T extends IOPayloadResult<infer U, any> ? U : never;

export type IOPayloadResultErrType<T extends IOPayloadResult<any, any>> =
  T extends IOPayloadResult<any, infer U> ? U : never;

export type GetIOPayloadOKTypeFrom<R extends IOPayloadResult<any, any>> =
  Extract<R, { ok: true }>['val'];

export type GetIOPayloadErrTypeFrom<R extends IOPayloadResult<any, any>> =
  Extract<R, { ok: false }>['val'];

// const xErr: IOPayloadResultErr<'asda'> = {
//   ok: false,
//   err: true,
//   val: 'asda',
// };

// const x = {} as IOPayloadResultErrType<typeof xErr>;
