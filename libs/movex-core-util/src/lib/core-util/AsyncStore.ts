import { AsyncResult } from 'ts-async-results';

export interface AsyncStore<TData> {
  get: (key: string) => AsyncResult<TData, unknown>;
  set: (key: string, data: TData) => AsyncResult<TData, unknown>;
  setPartial: (id: string, data: Partial<TData>) => AsyncResult<TData, unknown>;
  setFromPrev: (
    id: string,
    fn: (prev: TData) => TData
  ) => AsyncResult<TData, unknown>;
  remove: (id: string) => AsyncResult<void, unknown>;

  // Others can be set as well
}
