import {
  AddOperation,
  CopyOperation,
  GetOperation,
  MoveOperation,
  RemoveOperation,
  ReplaceOperation,
  TestOperation,
} from 'fast-json-patch';

export type NotUndefined =
  | object
  | string
  | number
  | boolean
  | null
  | NotUndefined[];

export type UnknownRecord = Record<string, unknown>;

export type JsonPatchOp<T> =
  | AddOperation<Partial<T>>
  | RemoveOperation
  | ReplaceOperation<T>
  | MoveOperation
  | CopyOperation
  // TODO: Not sure these 2 are needed
  | TestOperation<T>
  | GetOperation<T>;

export type JsonPatch<T> = JsonPatchOp<T>[];

export type IsOfType<U, T, K> = T extends U ? K : never;

export type OnlyKeysOfType<T, O extends Record<string, unknown>> = {
  [K in keyof O]: IsOfType<T, O[K], K>;
}[keyof O];
