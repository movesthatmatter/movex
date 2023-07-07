import {
  GenericResourceType,
  ResourceIdentifier,
  toResourceIdentifierStr,
  objectKeys,
  ResourceIdentifierStr,
  globalLogsy,
  toResultError,
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
  MovexStoreGetResourceError,
  MovexStoreItem,
  MovexStoreUpdateResourceError,
} from './MovexStore';
import { PromiseDelegate } from 'promise-delegate';
import { Pubsy } from 'ts-pubsy';

const logsy = globalLogsy.withNamespace('[LocalMovexStore]');

export class LocalStorageMovexStore<
  TState,
  TResourceType extends GenericResourceType = GenericResourceType
> implements MovexStore<TState, TResourceType>
{
  private locks: Record<string, PromiseDelegate> = {};

  private pubsy = new Pubsy<{
    onCreated: MovexStoreItem<TState>;
    onUpdated: MovexStoreItem<TState>;
  }>();

  constructor(
    private store: Storage,
    initialResources?: Record<ResourceIdentifierStr<TResourceType>, TState>
  ) {
    if (initialResources) {
      objectKeys(initialResources).forEach((nextRid) => {
        this.store.setItem(
          nextRid,
          this.encodeItem({
            rid: nextRid,
            state: computeCheckedState(initialResources[nextRid]),
            subscribers: {},
          })
        );
      });
    }
  }

  private encodeItem(item: MovexStoreItem<TState, TResourceType>) {
    return JSON.stringify(item);
  }

  private decodeItem(str: string): MovexStoreItem<TState, TResourceType> {
    return JSON.parse(str);
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

  get(rid: ResourceIdentifier<TResourceType>) {
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
  private getWithoutLock(
    rid: ResourceIdentifier<TResourceType>
  ): AsyncResult<
    MovexStoreItem<TState, TResourceType>,
    MovexStoreGetResourceError
  > {
    // const item = this.local[toResourceIdentifierStr(rid)];
    const rawItem = this.store.getItem(toResourceIdentifierStr(rid));

    if (!rawItem) {
      return new AsyncErr({
        type: 'MovexStoreError',
        reason: 'ResourceInexistent',
        content: {
          rid,
        },
      });
    }

    const item = this.decodeItem(rawItem);

    if (!item) {
      return new AsyncErr({
        type: 'MovexStoreError',
        reason: 'ResourceIsCorrupt',
        content: {
          rid,
        },
      });
    }

    return new AsyncOk(item);
  }

  create(rid: ResourceIdentifier<TResourceType>, nextState: TState) {
    const ridStr = toResourceIdentifierStr(rid);

    const next = {
      rid: ridStr,
      state: computeCheckedState(nextState),
      subscribers: {},
    };

    this.store.setItem(ridStr, this.encodeItem(next));

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

  updateState(
    rid: ResourceIdentifier<TResourceType>,
    getNext: ((prev: TState) => TState) | Partial<TState>
  ) {
    return this.update(rid, (prev) => ({
      ...prev,
      state: computeCheckedState({
        ...prev.state[0],
        ...(typeof getNext === 'function' ? getNext(prev.state[0]) : getNext),
      }),
    }));
  }

  update(
    rid: ResourceIdentifier<TResourceType>,
    getNext:
      | ((
          prev: MovexStoreItem<TState, TResourceType>
        ) => MovexStoreItem<TState, TResourceType>)
      | Partial<MovexStoreItem<TState, TResourceType>>
  ): AsyncResult<
    MovexStoreItem<TState, TResourceType>,
    MovexStoreUpdateResourceError
  > {
    return new AsyncResultWrapper(async () => {
      const unlock = await this.createLock(toResourceIdentifierStr(rid));

      return (
        this.getWithoutLock(rid)
          .map((prev) => {
            const nextPartialItem =
              typeof getNext === 'function' ? getNext(prev) : getNext;

            const nextItem = {
              ...prev,
              ...nextPartialItem,

              // This cannot be changed!
              rid: prev.rid,
            };

            this.store.setItem(prev.rid, this.encodeItem(nextItem));

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

  addPrivatePatch(
    rid: ResourceIdentifier<TResourceType>,
    patchGroupKey: string,
    patch: MovexStatePatch<TState>
  ) {
    return this.update(rid, (prev) => ({
      ...prev,
      patches: {
        ...prev.patches,
        [patchGroupKey]: [...(prev.patches?.[patchGroupKey] || []), patch],
      },
    }));
  }

  remove(rid: ResourceIdentifier<TResourceType>) {
    this.store.removeItem(toResourceIdentifierStr(rid));

    return AsyncOk.EMPTY;
  }

  clearAll() {
    this.store.clear();

    return AsyncOk.EMPTY;
  }

  onCreated(fn: (p: MovexStoreItem<TState>) => void) {
    return this.pubsy.subscribe('onCreated', fn);
  }

  onUpdated(fn: (p: MovexStoreItem<TState>) => void) {
    return this.pubsy.subscribe('onUpdated', fn);
  }

  all() {
    return this.store;
  }
}
