import { AsyncResult } from 'ts-async-results';
import {
  AnyResourceIdentifier,
  GenericResourceType,
  GenericResultError,
  JsonPatch,
  MovexClient,
  ResourceIdentifier,
  ResourceIdentifierStr,
  ResultError,
  toResultError,
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

export type ResourceInexistentError = ResultError<{
  type: 'MovexStoreError';
  reason: 'ResourceInexistent';
  content: {
    rid: AnyResourceIdentifier;
  };
}>;

type GenericMovexStoreError = GenericResultError<'MovexStoreError'>;

export type MovexStoreGetResourceError =
  | ResourceInexistentError
  | GenericMovexStoreError;

export type MovexStoreCreateResourceError =
  | ResultError<{
      type: 'MovexStoreError';
      reason: 'CreateResource';
    }>
  | GenericMovexStoreError;

export type MovexStoreUpdateResourceError =
  | ResourceInexistentError
  | GenericMovexStoreError;

export type MovexStoreRemoveResourceError =
  | ResourceInexistentError
  | GenericMovexStoreError;

export type MovexStoreError =
  | MovexStoreGetResourceError
  | MovexStoreCreateResourceError
  | MovexStoreUpdateResourceError
  | MovexStoreRemoveResourceError;

export interface MovexStore<
  T,
  TResourceType extends GenericResourceType = GenericResourceType
> {
  create: (
    rid: ResourceIdentifier<TResourceType>,
    data: T
  ) => AsyncResult<
    MovexStoreItem<T, TResourceType>,
    MovexStoreCreateResourceError
  >;
  get: (
    rid: ResourceIdentifier<TResourceType>,
    fragmentGroupKey?: string
  ) => AsyncResult<
    MovexStoreItem<T, TResourceType>,
    MovexStoreGetResourceError
  >;
  update: (
    rid: ResourceIdentifier<TResourceType>,
    getNext:
      | ((
          prev: MovexStoreItem<T, TResourceType>
        ) => MovexStoreItem<T, TResourceType>)
      | Partial<MovexStoreItem<T, TResourceType>>
  ) => AsyncResult<
    MovexStoreItem<T, TResourceType>,
    MovexStoreUpdateResourceError
  >;
  updateState: (
    rid: ResourceIdentifier<TResourceType>,
    getNext: ((prev: T) => T) | Partial<T>
  ) => AsyncResult<
    MovexStoreItem<T, TResourceType>,
    MovexStoreUpdateResourceError
  >;
  addPrivatePatch: (
    rid: ResourceIdentifier<TResourceType>,
    patchGroupKey: string,
    patch: MovexStatePatch<T>
  ) => AsyncResult<
    MovexStoreItem<T, TResourceType>,
    MovexStoreUpdateResourceError
  >;
  remove: (
    rid: GenericResourceType
  ) => AsyncResult<void, MovexStoreRemoveResourceError>;

  clearAll: () => AsyncResult<void, GenericMovexStoreError>;
  // Others can be set as well
}

export const toMovexStoreError = <
  TError extends MovexStoreError,
  TReason extends TError['reason'],
  TContent extends TError['content']
>(
  reason: TReason,
  content: TContent
) => toResultError('MovexStoreError', reason, content);
