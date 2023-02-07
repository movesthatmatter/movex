import { SessionClient, UnknownRecord } from '@matterio/core-util';

export type EmptyCollectionStoreOptions = {
  foreignKeys: {};
};

type FragmentPath = string;

export type SessionResource<TData extends UnknownRecord = {}> = {
  id: string;
  data: TData;
  subscribers: Record<
    SessionClient['id'],
    {
      subscribedAt: number;
    }
  >;
  // TODO: Might need a mor einvolved way to store and index this based on client ids and paths but for now this should do
  fragments?: Record<SessionClient['id'], Record<FragmentPath, Partial<TData>>>;
  // fragments?: Record<FragmentPath, Record<SessionClient['id'], Partial<TData>>>;
};

export type UnknwownSessionResourceCollectionMap = Record<
  string,
  SessionResource<UnknownRecord>
>;

export type AnySessionResourceCollectionMap = Record<
  string,
  SessionResource<any>
>;
