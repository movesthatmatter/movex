export type MovexState = Record<string, any>;

export type ValAndChecksum<T> = [T, string];

export type Checksum = string;

export type CheckedState<T> = [state: T, checksum: Checksum];
