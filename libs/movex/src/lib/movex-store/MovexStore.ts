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
  StringKeys,
  toResultError,
} from 'movex-core-util';
import { AnyAction } from '../tools/action';
import { CheckedState } from '../core-types';
import { BaseMovexDefinitionResourcesMap } from '../public-types';
import { GetReducerState } from '../tools';

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

export type MovexStoreItemsMapByType<
  TResourcesMap extends BaseMovexDefinitionResourcesMap
> = {
  [resourceType in StringKeys<TResourcesMap>]?: Record<
    ResourceIdentifierStr<resourceType>,
    MovexStoreItem<GetReducerState<TResourcesMap[resourceType]>, resourceType>
  >;
};

export type ResourceInexistentError = ResultError<{
  type: 'MovexStoreError';
  reason: 'ResourceInexistent';
  content: {
    rid: AnyResourceIdentifier;
  };
}>;

export type ResourceIsCorruptError = ResultError<{
  type: 'MovexStoreError';
  reason: 'ResourceIsCorrupt';
  content: {
    rid: AnyResourceIdentifier;
  };
}>;

type GenericMovexStoreError = GenericResultError<'MovexStoreError'>;

export type MovexStoreGetResourceError =
  | ResourceInexistentError
  | ResourceIsCorruptError
  | GenericMovexStoreError;

export type MovexStoreCreateResourceError =
  | ResultError<{
      type: 'MovexStoreError';
      reason: 'CreateResource';
    }>
  | GenericMovexStoreError;

export type MovexStoreUpdateResourceError =
  | ResourceInexistentError
  | ResourceIsCorruptError
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
  TResourcesMap extends BaseMovexDefinitionResourcesMap
> {
  create: <TResourceType extends StringKeys<TResourcesMap>>(
    rid: ResourceIdentifier<TResourceType>,
    data: GetReducerState<TResourcesMap[TResourceType]>
  ) => AsyncResult<
    MovexStoreItem<
      GetReducerState<TResourcesMap[TResourceType]>,
      TResourceType
    >,
    MovexStoreCreateResourceError
  >;
  get: <TResourceType extends StringKeys<TResourcesMap>>(
    rid: ResourceIdentifier<TResourceType>,
    fragmentGroupKey?: string
  ) => AsyncResult<
    MovexStoreItem<
      GetReducerState<TResourcesMap[TResourceType]>,
      TResourceType
    >,
    MovexStoreGetResourceError
  >;
  update: <TResourceType extends StringKeys<TResourcesMap>>(
    rid: ResourceIdentifier<TResourceType>,
    getNext:
      | ((
          prev: MovexStoreItem<
            GetReducerState<TResourcesMap[TResourceType]>,
            TResourceType
          >
        ) => MovexStoreItem<
          GetReducerState<TResourcesMap[TResourceType]>,
          TResourceType
        >)
      | Partial<
          MovexStoreItem<
            GetReducerState<TResourcesMap[TResourceType]>,
            TResourceType
          >
        >
  ) => AsyncResult<
    MovexStoreItem<
      GetReducerState<TResourcesMap[TResourceType]>,
      TResourceType
    >,
    MovexStoreUpdateResourceError
  >;
  updateState: <TResourceType extends StringKeys<TResourcesMap>>(
    rid: ResourceIdentifier<TResourceType>,
    getNext:
      | ((
          prev: GetReducerState<TResourcesMap[TResourceType]>
        ) => GetReducerState<TResourcesMap[TResourceType]>)
      | Partial<GetReducerState<TResourcesMap[TResourceType]>>
  ) => AsyncResult<
    MovexStoreItem<
      GetReducerState<TResourcesMap[TResourceType]>,
      TResourceType
    >,
    MovexStoreUpdateResourceError
  >;
  addPrivatePatch: <TResourceType extends StringKeys<TResourcesMap>>(
    rid: ResourceIdentifier<TResourceType>,
    patchGroupKey: string,
    patch: MovexStatePatch<GetReducerState<TResourcesMap[TResourceType]>>
  ) => AsyncResult<
    MovexStoreItem<
      GetReducerState<TResourcesMap[TResourceType]>,
      TResourceType
    >,
    MovexStoreUpdateResourceError
  >;
  remove: <TResourceType extends StringKeys<TResourcesMap>>(
    rid: ResourceIdentifier<TResourceType>
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
