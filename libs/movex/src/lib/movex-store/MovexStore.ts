import { AsyncResult } from 'ts-async-results';
import {
  GenericResourceType,
  JsonPatch,
  MovexClient,
  ResourceIdentifier,
  ResourceIdentifierStr,
} from 'movex-core-util';
import { AnyAction } from '../tools/action';
import { CheckedState } from '../core-types';

export type MovexStatePatch<T> = {
  action: AnyAction;
  patch: JsonPatch<T>;
};

export type MovexStoreItem<
  T,
  TResourceType extends GenericResourceType = GenericResourceType
> = {
  // TODO: Should this contain the id too? and be a key in the store itme? Maybe later :/
  state: CheckedState<T>;
  rid: ResourceIdentifierStr<TResourceType>;
  patches?: {
    [patchGroupKey in string]: MovexStatePatch<T>[];
  };
  subscribers: Record<
    MovexClient['id'],
    {
      subscribedAt: number;
    }
  >;
};

export interface MovexStore<
  T,
  TResourceType extends GenericResourceType = GenericResourceType
> {
  create: (
    rid: ResourceIdentifier<TResourceType>,
    data: T
  ) => AsyncResult<MovexStoreItem<T, TResourceType>, unknown>;
  get: (
    rid: ResourceIdentifier<TResourceType>,
    fragmentGroupKey?: string
  ) => AsyncResult<MovexStoreItem<T, TResourceType>, string>;
  update: (
    rid: ResourceIdentifier<TResourceType>,
    getNext:
      | ((
          prev: MovexStoreItem<T, TResourceType>
        ) => MovexStoreItem<T, TResourceType>)
      | Partial<MovexStoreItem<T, TResourceType>>
  ) => AsyncResult<MovexStoreItem<T, TResourceType>, unknown>;
  updateState: (
    rid: ResourceIdentifier<TResourceType>,
    getNext: ((prev: T) => T) | Partial<T>
  ) => AsyncResult<MovexStoreItem<T, TResourceType>, unknown>;
  addPrivatePatch: (
    rid: ResourceIdentifier<TResourceType>,
    patchGroupKey: string,
    patch: MovexStatePatch<T>
  ) => AsyncResult<MovexStoreItem<T, TResourceType>, unknown>;
  remove: (rid: GenericResourceType) => AsyncResult<void, unknown>;

  clearAll: () => AsyncResult<void, unknown>;
  // Others can be set as well
}
