import {
  GenericResourceType,
  ResourceIdentifier,
  toResourceIdentifierStr,
  objectKeys,
  ResourceIdentifierStr,
} from 'movex-core-util';
import { AsyncErr, AsyncOk } from 'ts-async-results';
import { computeCheckedState } from '../util';
import { MovexStatePatch, MovexStore, MovexStoreItem } from './MovexStore';

export class LocalMovexStore<
  TState,
  TResourceType extends GenericResourceType = GenericResourceType
> implements MovexStore<TState, TResourceType>
{
  private local: Record<string, MovexStoreItem<TState, TResourceType>> = {};

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

  get(rid: ResourceIdentifier<TResourceType>) {
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
    return this.get(rid).map((prev) => {
      const nextCheckedState = computeCheckedState({
        ...prev.state[0],
        ...(typeof getNext === 'function' ? getNext(prev.state[0]) : getNext),
      });

      this.local = {
        ...this.local,
        [prev.rid]: {
          ...prev,
          state: nextCheckedState,
        },
      };

      return this.local[prev.rid];
    });
  }

  update(
    rid: ResourceIdentifier<TResourceType>,
    getNext:
      | ((
          prev: MovexStoreItem<TState, TResourceType>
        ) => MovexStoreItem<TState, TResourceType>)
      | Partial<MovexStoreItem<TState, TResourceType>>
  ) {
    return this.get(rid).map((prev) => {
      const nextItem = typeof getNext === 'function' ? getNext(prev) : getNext;

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
    });
  }

  addPrivatePatch(
    rid: ResourceIdentifier<TResourceType>,
    patchGroupKey: string,
    patch: MovexStatePatch<TState>
  ) {
    return this.get(rid).map((prev) => {
      this.local = {
        ...this.local,
        [prev.rid]: {
          ...prev,
          patches: {
            ...prev.patches,
            [patchGroupKey]: [...(prev.patches?.[patchGroupKey] || []), patch],
          },
        },
      };

      return this.local[prev.rid];
    });
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
