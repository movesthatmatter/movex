export { v4 as getUuid } from 'uuid';
import { applyReducer, compare, deepClone } from 'fast-json-patch';
import {
  JsonPatch,
  isObject,
  GenericResourceType,
  MovexClientResourceShape,
  toResourceIdentifierStr,
  objectKeys,
  MovexClientInfo,
  MovexClient,
} from 'movex-core-util';
import { MovexStoreItem } from 'movex-store';

export const applyMovexStatePatches = <TState>(
  state: TState,
  patchesInOrder: JsonPatch<TState>[]
): TState => {
  const allPatchesInOrder = patchesInOrder.reduce(
    // Here there could be some logic on finding the same path in the diff,
    //  and apply some optimization or heuristic for the reconciliation
    (accum, next) => [...accum, ...next],
    []
  );

  return allPatchesInOrder.reduce(
    applyReducer,
    // TODO: This is expensive but otherwise the state gets mutated. Need to look into maybe another way?
    deepClone(state)
  );
};

export const getMovexStatePatch = <A, B extends A>(
  a: A,
  b: B
): JsonPatch<A> => {
  if ((isObject(a) && isObject(b)) || (Array.isArray(a) && Array.isArray(b))) {
    return getJSONPatchDiff(a, b);
  }

  // Primitives
  // should this really be spporting primitives as well? Why not?
  // TODO:
  if (a !== b) {
    return [
      {
        // Is this correct or what should happen in case of primitives?
        path: '',
        op: 'replace',
        value: b,
      },
    ];
  }

  // TODO: Empty array if the same??
  return [];
};

const getJSONPatchDiff = <
  A extends Record<string, any> | any[],
  B extends Record<string, any> | any[]
>(
  a: A,
  b: B
) => compare(a, b);

export function getRandomInt(givenMin: number, givenMax: number) {
  const min = Math.ceil(givenMin);
  const max = Math.floor(givenMax);

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const itemToSanitizedClientResource = <
  TResourceType extends GenericResourceType,
  TState
>(
  item: MovexStoreItem<TState, TResourceType> & {
    subscribers: Record<
      MovexClient['id'],
      {
        info: MovexClient['info'];
      }
    >;
  }
): MovexClientResourceShape<TResourceType, TState> => ({
  rid: toResourceIdentifierStr(item.rid),
  state: item.state,
  subscribers: objectKeys(item.subscribers).reduce(
    (prev, nextSubId) => ({
      ...prev,
      [nextSubId]: {
        id: nextSubId,
        info: item.subscribers[nextSubId].info || {},
      },
    }),
    {} as MovexClientResourceShape<TResourceType, TState>['subscribers']
  ),
});
