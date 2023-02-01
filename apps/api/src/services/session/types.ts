import { SessionClient, UnknownRecord } from '@matterio/core-util';

export type EmptyCollectionStoreOptions = {
  foreignKeys: {};
};

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

export type UnknwownSessionResourceCollectionMap = Record<
  string,
  SessionResource<UnknownRecord>
>;

export type AnySessionResourceCollectionMap = Record<
  string,
  SessionResource<any>
>;