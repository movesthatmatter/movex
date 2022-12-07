export type UnknownRecord = Record<string, unknown>;

type ResourceType = string;

export type Client<Info extends UnknownRecord = {}> = {
  id: string;
  info?: Info; // User Info or whatever
  subscriptions: Record<
    `${ResourceType}:${Resource['id']}`,
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

export type Topic<TUniqueName extends string> = {
  id: TUniqueName;
  subscribers: Record<Client['id'], null>; // Here it could use the full Peer?
};

export type Resource<TData extends UnknownRecord = {}> = {
  id: string;
  data: TData;
  subscribers: Record<
    Client['id'],
    {
      subscribedAt: number;
    }
  >;
};

// export type ObservableResource<TData extends UnknownRecord = {}> =
// Resource<TData> & {
//   topic: Topic<string>['id'];
// };

// export type Activity<TType extends string, Info extends UnknownRecord = {}> = {
//   id: string;
//   type: TType;
//   info?: Info;
// }

// export type Activity = {
//   id: string;
//   type: string; // Add this level the type is generic

//   subscribers: Record<Peer['id'], undefined>; // Here it could use the full Peer?
//   // Other important info such as
// };

// export type RoomRecord = {
//   id: string;
//   slug: string;
//   name: string;
//   code: string;

//   // This to be defined by the user
//   // info?: {}
// }

// export type Topic<>
