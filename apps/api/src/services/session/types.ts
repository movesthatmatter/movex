import { SessionClient, UnknownRecord } from '@matterio/core-util';

export type EmptyCollectionStoreOptions = {
  foreignKeys: {};
};

export type FragmentPath = string;

export type FragmentsByPath<TData extends UnknownRecord> = Record<
  FragmentPath,
  Partial<TData>
>;

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
  fragments?: Record<SessionClient['id'], FragmentsByPath<TData>>;
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
