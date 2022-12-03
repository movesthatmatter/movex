export type UnknownRecord = Record<string, unknown>;

export type Peer<Info extends UnknownRecord = {}> = {
  id: string;
  info?: Info; // maybe the userId comes in the extra
  subscriptions: Record<Topic<string>['id'], null>;
};

export type Topic<TUniqueName extends string> = {
  id: TUniqueName;
  subscribers: Record<Peer['id'], null>; // Here it could use the full Peer?
};

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
