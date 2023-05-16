import {
  GenericResourceType,
  ResourceIdentifier,
  toResourceIdentifierStr,
  objectKeys,
  ResourceIdentifierStr,
  getRandomInt,
} from 'movex-core-util';
import { AsyncErr, AsyncOk, AsyncResultWrapper } from 'ts-async-results';
import { computeCheckedState } from '../util';
import { MovexStatePatch, MovexStore, MovexStoreItem } from './MovexStore';
import { PromiseDelegate } from 'promise-delegate';

export class LocalMovexStore<
  TState,
  TResourceType extends GenericResourceType = GenericResourceType
> implements MovexStore<TState, TResourceType>
{
  private local: Record<string, MovexStoreItem<TState, TResourceType>> = {};

  private locks: Record<string, PromiseDelegate> = {};

  constructor(
    initialResources?: Record<ResourceIdentifierStr<TResourceType>, TState>
  ) {
    if (initialResources) {
      this.local = objectKeys(initialResources).reduce((accum, nextRid) => {
        return {
          ...accum,
          [nextRid]: {
            rid: nextRid,
            state: computeCheckedState(initialResources[nextRid]),
            subscribers: {},
          },
        };
      }, {} as Record<string, MovexStoreItem<TState, TResourceType>>);
    }
  }

  private async createLock(name: string) {
    const prevLock = this.locks[name];

    // If there is a previous lock, wait for it
    if (prevLock) {
      await prevLock.promise.then(() => {
        // Clean itself up
        const { name: removed, ...rest } = this.locks;

        // Remove the current delegate from locks
        this.locks = rest;
      });
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
    });
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
  private getWithoutLock(rid: ResourceIdentifier<TResourceType>) {
    const item = this.local[toResourceIdentifierStr(rid)];

    if (item) {
      return new AsyncOk(item);
    }

    return new AsyncErr('NOT_EXISTENT');
  }

  create(rid: ResourceIdentifier<TResourceType>, nextState: TState) {
    const ridStr = toResourceIdentifierStr(rid);

    const next = {
      rid: ridStr,
      state: computeCheckedState(nextState),
      subscribers: {},
    };

    this.local = {
      ...this.local,
      [ridStr]: next,
    };

    return new AsyncOk(next);
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
  ) {
    return new AsyncResultWrapper(async () => {
      const unlock = await this.createLock(toResourceIdentifierStr(rid));

      return (
        this.getWithoutLock(rid)
          .map((prev) => {
            const nextItem =
              typeof getNext === 'function' ? getNext(prev) : getNext;

            this.local = {
              ...this.local,
              [prev.rid]: {
                ...prev,
                ...nextItem,

                // This cannot be changed!
                rid: prev.rid,
              },
            };

            return this.local[prev.rid];
          })
          // Unlock it
          .map((r) => {
            unlock();
            return r;
          })
          .mapErr((e) => {
            unlock();
            return e;
          })
      );
    });
  }

  // TODO: This should use the update
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

  remove(key: string) {
    const { [key]: remove, ...rest } = this.local;

    this.local = rest;

    return AsyncOk.EMPTY;
  }

  clearAll() {
    this.local = {};

    return AsyncOk.EMPTY;
  }
}
