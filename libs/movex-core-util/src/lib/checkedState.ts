import { MD5 } from 'object-hash'; // TODO: If I can get a smaller version of this would be golded
import type { CheckedState } from './core-types';

export const computeCheckedState = <T>(state: T): CheckedState<T> => [
  state,
  state === undefined ? '' : MD5(state), // hashing the object
];

export const checkedStateEquals = <
  A extends CheckedState<any>,
  B extends CheckedState<any>
>(
  a: A,
  b: B
  // They are the same if the instances are the same [0] or if the checksums are the same [1]
) => a[0] === b[0] || a[1] === b[1];
