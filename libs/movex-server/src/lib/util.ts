type TupleToUnionType<T extends any[]> = T[number];

export const isOneOf = <T extends string | number, List extends T[]>(
  k: T | undefined,
  listOfOptions: List
): k is TupleToUnionType<List> => !!k && listOfOptions.indexOf(k) > -1;

export const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
