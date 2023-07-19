import {
  ResourceIdentifier,
  toResourceIdentifierStr,
  objectKeys,
  ResourceIdentifierStr,
  globalLogsy,
  toResultError,
  StringKeys,
  toResourceIdentifierObj,
} from 'movex-core-util';
import {
  AsyncErr,
  AsyncOk,
  AsyncResult,
  AsyncResultWrapper,
} from 'ts-async-results';
import { computeCheckedState } from '../util';
import {
  MovexStatePatch,
  MovexStore,
  MovexStoreCreateResourceError,
  MovexStoreGetResourceError,
  MovexStoreItem,
  MovexStoreItemsMapByType,
  MovexStoreUpdateResourceError,
} from './MovexStore';
import { PromiseDelegate } from 'promise-delegate';
import { Pubsy } from 'ts-pubsy';
import { BaseMovexDefinitionResourcesMap } from '../public-types';
import { GetReducerState } from '../tools';

const logsy = globalLogsy.withNamespace('[LocalMovexStore]');

export class MemoryMovexStore<
  TResourcesMap extends BaseMovexDefinitionResourcesMap = BaseMovexDefinitionResourcesMap
> implements MovexStore<TResourcesMap>
{
  private local: MovexStoreItemsMapByType<TResourcesMap> =
    {} as MovexStoreItemsMapByType<TResourcesMap>;

  private locks: Record<string, PromiseDelegate> = {};

  private pubsy = new Pubsy<{
    onCreated: MovexStoreItem<
      GetReducerState<TResourcesMap[StringKeys<TResourcesMap>]>
    >;
    onUpdated: MovexStoreItem<
      GetReducerState<TResourcesMap[StringKeys<TResourcesMap>]>
    >;
  }>();

  constructor(initialResources?: {
    [resourceType in StringKeys<TResourcesMap>]?: Record<
      ResourceIdentifierStr<resourceType>,
      GetReducerState<TResourcesMap[resourceType]>
    >;
  }) {
    if (initialResources) {
      const flatten = objectKeys(initialResources).reduce(
        (accum, nextResourceType) => {
          return {
            ...accum,
            ...initialResources[nextResourceType],
          };
        },
        {} as Record<
          ResourceIdentifierStr<StringKeys<TResourcesMap>>,
          GetReducerState<TResourcesMap[StringKeys<TResourcesMap>]>
        >
      );

      this.local = objectKeys(flatten).reduce((accum, nextRid) => {
        const { resourceType } = toResourceIdentifierObj(nextRid);

        return {
          ...accum,
          [resourceType]: {
            ...accum[resourceType as any],
            [nextRid]: {
              rid: nextRid,
              state: computeCheckedState(flatten[nextRid]),
              subscribers: {},
            },
          },
        };
      }, {} as MovexStoreItemsMapByType<TResourcesMap>);
    }
  }

  private async createLock(name: string) {
    const prevLock = this.locks[name];

    // If there is a previous lock, wait for it
    if (prevLock) {
      try {
        await prevLock.promise.then(() => {
          // Clean itself up
          const { name: removed, ...rest } = this.locks;

          // Remove the current delegate from locks
          this.locks = rest;
        });
      } catch (e) {
        return Promise.reject(
          toResultError('LocalMovexStore', 'Create Lock Issue', { error: e })
        );
      }
    }

    const nextLock = new PromiseDelegate();

    this.locks[name] = nextLock;

    // Return the Unlocker Fn
    return () => nextLock.resolve();
  }

  private async waitForLock(name: string) {
    const prevLock = this.locks[name];

    if (prevLock) {
      await prevLock.promise;
    }

    return undefined;
  }

  get<TResourceType extends StringKeys<TResourcesMap>>(
    rid: ResourceIdentifier<TResourceType>
  ): AsyncResult<
    MovexStoreItem<
      GetReducerState<TResourcesMap[TResourceType]>,
      TResourceType
    >,
    MovexStoreGetResourceError
  > {
    return new AsyncResultWrapper(async () => {
      await this.waitForLock(toResourceIdentifierStr(rid));

      return this.getWithoutLock(rid);
    }).mapErr(
      AsyncResult.passThrough((e) => {
        logsy.error('Get Error', e);
      })
    );
  }

  /**
   * This is a very special function which is only used internally (only inside Update)
   * b/c the update and get both depend on locks, and they could deadlock each other.
   *
   * Whenever an external client needs to retrieve an item, it should simply wait for the lock,
   * which always gets the most fresh state. This is especially impoortant with concurrent updates.
   *
   * @param rid
   * @returns
   */
  private getWithoutLock<TResourceType extends StringKeys<TResourcesMap>>(
    rid: ResourceIdentifier<TResourceType>
  ): AsyncResult<
    MovexStoreItem<
      GetReducerState<TResourcesMap[StringKeys<TResourcesMap>]>,
      TResourceType
    >,
    MovexStoreGetResourceError
  > {
    const { resourceType } = toResourceIdentifierObj(rid);
    const item = this.local[resourceType]?.[toResourceIdentifierStr(rid)];

    if (item) {
      return new AsyncOk(item);
    }

    return new AsyncErr({
      type: 'MovexStoreError',
      reason: 'ResourceInexistent',
      content: {
        rid,
      },
    });
  }

  create<TResourceType extends StringKeys<TResourcesMap>>(
    rid: ResourceIdentifier<TResourceType>,
    nextState: GetReducerState<TResourcesMap[TResourceType]>
  ): AsyncResult<
    MovexStoreItem<
      GetReducerState<TResourcesMap[TResourceType]>,
      TResourceType
    >,
    MovexStoreCreateResourceError
  > {
    const { resourceType } = toResourceIdentifierObj(rid);
    const ridStr = toResourceIdentifierStr(rid);

    const next = {
      rid: ridStr,
      state: computeCheckedState(nextState),
      subscribers: {},
    };

    this.local = {
      ...this.local,
      [resourceType]: {
        ...this.local[resourceType],
        [ridStr]: next,
      },
    };

    return new AsyncOk(next)
      .map(
        AsyncResult.passThrough((r) => {
          this.pubsy.publish('onCreated', r);
        })
      )
      .mapErr(
        AsyncResult.passThrough((e) => {
          logsy.error('Create Error', e);
        })
      );
  }

  updateState<TResourceType extends StringKeys<TResourcesMap>>(
    rid: ResourceIdentifier<TResourceType>,
    getNext:
      | ((
          prev: GetReducerState<TResourcesMap[TResourceType]>
        ) => GetReducerState<TResourcesMap[TResourceType]>)
      | Partial<GetReducerState<TResourcesMap[TResourceType]>>
  ) {
    return this.update(rid, (prev) => ({
      ...prev,
      state: computeCheckedState({
        ...prev.state[0],
        ...(typeof getNext === 'function' ? getNext(prev.state[0]) : getNext),
      }),
    }));
  }

  update<TResourceType extends StringKeys<TResourcesMap>>(
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
  ): AsyncResult<
    MovexStoreItem<
      GetReducerState<TResourcesMap[TResourceType]>,
      TResourceType
    >,
    MovexStoreUpdateResourceError
  > {
    return new AsyncResultWrapper(async () => {
      const unlock = await this.createLock(toResourceIdentifierStr(rid));

      return (
        this.getWithoutLock(rid)
          .map((prev) => {
            const nextGivenItem =
              typeof getNext === 'function' ? getNext(prev) : getNext;

            const { resourceType } = toResourceIdentifierObj(rid);

            const nextItem = {
              ...prev,
              ...nextGivenItem,

              // This cannot be changed!
              rid: prev.rid,
            };

            this.local = {
              ...this.local,
              [resourceType]: {
                ...this.local[resourceType],
                [prev.rid]: nextItem,
              },
            };

            return nextItem;
          })
          // Unlock it
          .map(AsyncResult.passThrough(unlock))
          .mapErr(AsyncResult.passThrough(unlock))
          // And publish the onUpdated
          .map(
            AsyncResult.passThrough((r) => {
              this.pubsy.publish('onUpdated', r);
            })
          )
      );
    }).mapErr(
      AsyncResult.passThrough((e) => {
        logsy.error('Update Error', e, rid);
      })
    );
  }

  addPrivatePatch<TResourceType extends StringKeys<TResourcesMap>>(
    rid: ResourceIdentifier<TResourceType>,
    patchGroupKey: string,
    patch: MovexStatePatch<GetReducerState<TResourcesMap[TResourceType]>>
  ) {
    return this.update(rid, (prev) => ({
      ...prev,
      patches: {
        ...prev.patches,
        [patchGroupKey]: [...(prev.patches?.[patchGroupKey] || []), patch],
      },
    }));
  }

  remove<TResourceType extends StringKeys<TResourcesMap>>(
    rid: ResourceIdentifier<TResourceType>
  ) {
    const { resourceType } = toResourceIdentifierObj(rid);

    const { [toResourceIdentifierStr(rid)]: remove, ...nextResourceType } =
      this.local[resourceType];

    this.local = {
      ...this.local,
      [resourceType]: nextResourceType,
    };

    return AsyncOk.EMPTY;
  }

  clearAll() {
    this.local = {};

    return AsyncOk.EMPTY;
  }

  onCreated(
    fn: (
      p: MovexStoreItem<
        GetReducerState<TResourcesMap[StringKeys<TResourcesMap>]>
      >
    ) => void
  ) {
    return this.pubsy.subscribe('onCreated', fn);
  }

  onUpdated(
    fn: (
      p: MovexStoreItem<
        GetReducerState<TResourcesMap[StringKeys<TResourcesMap>]>
      >
    ) => void
  ) {
    return this.pubsy.subscribe('onUpdated', fn);
  }

  all() {
    return this.local;
  }
}
