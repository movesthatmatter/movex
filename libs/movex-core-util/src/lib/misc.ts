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
