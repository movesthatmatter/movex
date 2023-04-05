import {
  GenericResourceType,
  ResourceIdentifier,
  toResourceIdentifierStr,
  objectKeys,
  toResourceIdentifierObj,
} from 'movex-core-util';
import { AsyncErr, AsyncOk } from 'ts-async-results';
import { computeCheckedState } from '../util';
import { MovexStatePatch, MovexStore, MovexStoreItem } from './MovexStore';

export class LocalMovexStore<
  TState,
  TResourceType extends GenericResourceType = GenericResourceType
> implements MovexStore<TState, TResourceType>
{
  private local: Record<string, MovexStoreItem<TState>> = {};

  constructor(initialResources?: Record<string, TState>) {
    if (initialResources) {
      this.local = objectKeys(initialResources).reduce((accum, nextRid) => {
        return {
          ...accum,
          [nextRid]: {
            id: nextRid,
            state: computeCheckedState(initialResources[nextRid]),
            subscribers: {},
          },
        };
      }, {} as Record<string, MovexStoreItem<TState>>);
    }
  }

  private ridToId(rid: ResourceIdentifier<TResourceType>) {
    return toResourceIdentifierObj(rid).resourceId as string; // TODO: Does this need to be rid?
  }

  get(rid: ResourceIdentifier<TResourceType>) {
    const item = { ...this.local[this.ridToId(rid)] };

    if (item) {
      return new AsyncOk(item);
    }

    return new AsyncErr('NOT_EXISTENT');
  }

  create(rid: ResourceIdentifier<TResourceType>, nextState: TState) {
    const id = this.ridToId(rid);

    const next = {
      id,
      state: computeCheckedState(nextState),
      subscribers: {},
    };

    this.local = {
      ...this.local,
      [id]: next,
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
        [prev.id]: {
          ...prev,
          state: nextCheckedState,
        },
      };

      return this.local[prev.id];
    });
  }

  update(
    rid: ResourceIdentifier<TResourceType>,
    getNext:
      | ((prev: MovexStoreItem<TState>) => MovexStoreItem<TState>)
      | Partial<MovexStoreItem<TState>>
  ) {
    return this.get(rid).map((prev) => {
      const nextItem = typeof getNext === 'function' ? getNext(prev) : getNext;

      this.local = {
        ...this.local,
        [prev.id]: {
          ...prev,
          ...nextItem,

          // This cannot be changed!
          id: prev.id,
        },
      };

      return this.local[prev.id];
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
        [prev.id]: {
          ...prev,
          patches: {
            ...prev.patches,
            [patchGroupKey]: [...(prev.patches?.[patchGroupKey] || []), patch],
          },
        },
      };

      return this.local[prev.id];
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
