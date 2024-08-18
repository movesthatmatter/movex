export enum MasterQueries {
  now = '$mvx:NOW()',
  // 'lag' = '$LOG',
}

export type MovexMasterQueries = {
  now: () => number;
  // lag: () => number;
};

export const masterMovexQueries = {
  now: () => MasterQueries['now'] as unknown as number,
};