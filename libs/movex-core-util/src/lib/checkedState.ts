import type { CheckedState } from './core-types';
import { md5 } from './md5';
import { isObject } from './misc';

/**
 * @param {object} obj Object to sort.
 * @returns {object} Copy of object with keys sorted in all nested objects
 */
const deepSort = <T>(obj: T): T => {
  if (Array.isArray(obj)) {
    return obj.map((item) => deepSort(item)) as T;
  }

  if (obj && typeof obj === 'object') {
    return Object.keys(obj)
      .sort()
      .reduce((out, key) => {
        (out as any)[key] = deepSort((obj as any)[key]);
        return out;
      }, {}) as T;
  }
  return obj;
};

export const computeCheckedState = <T>(state: T): CheckedState<T> => [
  state,
  state === undefined ? '' : hashObject(state),
];

const hashObject = (s: unknown) => {
  if (Array.isArray(s)) {
    return md5(JSON.stringify(s));
  }

  if (isObject(s)) {
    return md5(JSON.stringify(deepSort(s)));
  }

  return md5(s);
};

export const checkedStateEquals = <
  A extends CheckedState<any>,
  B extends CheckedState<any>
>(
  a: A,
  b: B
  // They are the same if the instances are the same [0] or if the checksums are the same [1]
) => a[0] === b[0] || a[1] === b[1];
