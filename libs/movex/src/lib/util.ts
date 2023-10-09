import { compare, applyReducer, deepClone } from 'fast-json-patch';
import hash from 'object-hash';
import { isObject, JsonPatch, NotUndefined } from 'movex-core-util';
import { CheckedState, MovexState } from './core-types';

export const hashObject = (val: NotUndefined) => hash.MD5(val);

export const computeCheckedState = <T>(state: T): CheckedState<T> => [
  state,
  state === undefined ? '' : hashObject(state),
];

export const checkedStateEquals = <
  A extends CheckedState<any>,
  B extends CheckedState<any>
>(
  a: A,
  b: B
  // They are the same if the instances are the same [0] or if the checksums are the same [1]
) => a[0] === b[0] || a[1] === b[1];

export const getJSONPatchDiff = <
  A extends Record<string, any> | any[],
  B extends Record<string, any> | any[]
>(
  a: A,
  b: B
) => compare(a, b);

// @rename to applyMovexPatches
export const reconciliatePrivateFragments = <TState extends MovexState>(
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

export const applyMovexStatePatches = reconciliatePrivateFragments;
