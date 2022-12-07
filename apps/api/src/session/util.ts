export const delay = async <T>(fn: () => T, ms: number = 250) =>
  new Promise<T>((resolve) => {
    setTimeout(() => resolve(fn()), ms);
  });

export const noop = () => {};

export const objectKeys = <O extends object>(o: O) =>
  Object.keys(o) as (keyof O)[];
