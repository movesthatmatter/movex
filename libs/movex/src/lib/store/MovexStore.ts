import { AsyncResult } from 'ts-async-results';
import {
  GenericResourceType,
  JsonPatch,
  ResourceIdentifier,
} from 'movex-core-util';
import { AnyAction } from '../tools/action';
import { CheckedState } from '../core-types';

export type MovexStatePatch<T> = {
  action: AnyAction;
  patch: JsonPatch<T>;
};

export type MovexStoreItem<T> = {
  // TODO: Should this contain the id too? and be a key in the store itme? Maybe later :/
  state: CheckedState<T>;
  id: string;
  patches?: {
    [patchGroupKey in string]: MovexStatePatch<T>[];
  };
};

export interface MovexStore<
  T,
  TResourceType extends GenericResourceType = GenericResourceType
> {
  get: (
    rid: ResourceIdentifier<TResourceType>,
    fragmentGroupKey?: string
  ) => AsyncResult<MovexStoreItem<T>, string>;
  create: (
    rid: ResourceIdentifier<TResourceType>,
    data: T
  ) => AsyncResult<MovexStoreItem<T>, unknown>;
  update: (
    rid: ResourceIdentifier<TResourceType>,
    getNext: ((prev: T) => T) | Partial<T>
  ) => AsyncResult<MovexStoreItem<T>, unknown>;
  addPrivatePatch: (
    rid: ResourceIdentifier<TResourceType>,
    patchGroupKey: string,
    patch: MovexStatePatch<T>
  ) => AsyncResult<MovexStoreItem<T>, unknown>;
  remove: (rid: GenericResourceType) => AsyncResult<void, unknown>;

  clearAll: () => AsyncResult<void, unknown>;
  // Others can be set as well
}
