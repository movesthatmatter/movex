import {
  DistributiveOmit,
  TupleToUnionType,
  UnknownRecord,
} from './core-types';

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

export const objectOmit = <O extends Object, ToOmit extends (keyof O)[]>(
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

export const objectPick = <O extends Object, ToPick extends (keyof O)[]>(
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

export const isOneOf = <T extends string | number, List extends T[]>(
  k: T | undefined,
  listOfOptions: List
): k is TupleToUnionType<List> => !!k && listOfOptions.indexOf(k) > -1;

export const makeTimestampsInRecordReadable = <r extends UnknownRecord>(
  x: r,
  keysList: (keyof r)[]
) => {
  const onlyKeysObject = objectPick(x, keysList);
  return objectKeys(onlyKeysObject).reduce((prev, next) => {
    const val = x[next];

    return {
      ...prev,
      [next]: typeof val === 'number' ? timestampToDateString(val) : x[next],
    };
  }, {} as typeof x);
};

export const timestampToDateString = (d: number) =>
  new Date(d).toLocaleString();
