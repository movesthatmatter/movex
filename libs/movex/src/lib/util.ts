import hash from 'object-hash';
import * as jsonpatch from 'fast-json-patch';
import {
  invoke,
  isObject,
  keyInObject,
  noop,
  NotUndefined,
  Observable,
  StringKeys,
} from 'movex-core-util';
import {
  Action,
  ActionCreatorsMapBase,
  ActionOrActionTuple,
  ActionsCollectionMapBase,
  GenericAction,
  GenericPrivateAction,
  GenericPublicAction,
} from './tools/action';
import { CheckedState, MovexState } from './core-types';
import { MovexReducerFromActionsMap, MovexReducerMap } from './tools/reducer';

export const hashObject = (val: NotUndefined) => hash.MD5(val);

// export const createMovexReducerMap = <
//   ActionsCollectionMap extends ActionsCollectionMapBase,
//   TState extends MovexState
// >(
//   initialState: TState
// ) => {
//   // Do we need to do smtg with the initialState?

//   return <TReducerMap extends MovexReducerMap<TState, ActionsCollectionMap>>(
//     reducerMap: TReducerMap
//   ) => reducerMap;
// };

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

// import { Difference } from './diff';
//
// export type StateDiff = Difference;

// export const getJSONDiff = <
//   A extends Record<string, any> | any[],
//   B extends Record<string, any> | any[]
// >(
//   a: A,
//   b: B
// ): StateDiff => (microdiff as any)(a, b, { cyclesFix: false });

export const getJSONPatchDiff = <
  A extends Record<string, any> | any[],
  B extends Record<string, any> | any[]
>(
  a: A,
  b: B
) => jsonpatch.compare(a, b);

type JsonPatch = jsonpatch.Operation[];

export type PrivateFragment = JsonPatch;

export const reconciliatePrivateFragments = <TState extends MovexState>(
  state: TState,
  fragmentsInOrder: PrivateFragment[]
): TState => {
  const allFragmentsInOrder = fragmentsInOrder.reduce(
    // Here there could be some logic on finding the same path in the diff,
    //  and apply some optimization or heuristic for the reconciliation
    (accum, next) => [...accum, ...next],
    []
  );

  return allFragmentsInOrder.reduce(
    jsonpatch.applyReducer,
    // This is expensive but otherwise the state gets mutated. Need to look into maybe another way?
    jsonpatch.deepClone(state)
  );
};

export const getStateDiff = <A extends MovexState, B extends MovexState>(
  a: A,
  b: B
) => getJSONPatchDiff(a, b);

// export const resourceFile = () => {};
