export enum MovexMasterContextMap {
  requestAt = '$rqstAt$',
  // Can add more such as "lag"
}

export type MovexMasterContext = {
  requestAt: number; // timestamp
};

export type MovexMasterContextAsQuery = {
  requestAt: () => number;
};

export const masterContextQuery: MovexMasterContextAsQuery = {
  requestAt: () => MovexMasterContextMap['requestAt'] as unknown as number,
};

export const localMasterContextQuery: MovexMasterContextAsQuery = {
  requestAt: () => new Date().getTime(),
};
