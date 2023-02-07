export const objectKeys = <O extends object>(o: O) =>
  Object.keys(o) as (keyof O)[];

export const toDictIndexedBy = <
  O extends object,
  KGetter extends (o: O) => string
>(
  list: O[],
  getKey: KGetter
) =>
  list.reduce(
    (prev, next) => ({
      ...prev,
      [getKey(next)]: next,
    }),
    {} as { [k: string]: O }
  );

export function getRandomInt(givenMin: number, givenMax: number) {
  const min = Math.ceil(givenMin);
  const max = Math.floor(givenMax);

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const invoke = <T>(fn: () => T): T => fn();
