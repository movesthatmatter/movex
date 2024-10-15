import { DistributiveOmit, TupleToUnionType } from './core-types';

export const objectKeys = <O extends object>(o: O) =>
  Object.keys(o) as (keyof O)[];

export const invoke = <T>(fn: () => T): T => fn();

export const noop = () => {
  //nothing much
};

// Use this to get inherited keys as well
export const keyInObject = <X extends object, Y extends PropertyKey>(
  obj: X,
  prop: Y
): obj is X & Record<Y, unknown> => prop in obj;

export const isObject = (o: unknown): o is object => {
  return typeof o === 'object' && !Array.isArray(o) && o !== null;
};

export const isFunction = (x: unknown): x is (...args: any) => any =>
  typeof x === 'function';

export const objectOmit = <O extends object, ToOmit extends (keyof O)[]>(
  o: O,
  toOmit: ToOmit
) =>
  objectKeys(o).reduce((prev, nextKey) => {
    if (toOmit.indexOf(nextKey) > -1) {
      return prev;
    }

    return {
      ...prev,
      [nextKey]: o[nextKey],
    };
  }, {} as DistributiveOmit<O, TupleToUnionType<ToOmit>>);

export const objectPick = <O extends object, ToPick extends (keyof O)[]>(
  o: O,
  toPick: ToPick
) =>
  objectKeys(o).reduce((prev, nextKey) => {
    if (toPick.indexOf(nextKey) === -1) {
      return prev;
    }

    return {
      ...prev,
      [nextKey]: o[nextKey],
    };
  }, {} as Pick<O, TupleToUnionType<ToPick>>);
