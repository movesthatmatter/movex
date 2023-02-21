import * as jsonpatch from 'fast-json-patch';
import { MovexState } from './types';
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
