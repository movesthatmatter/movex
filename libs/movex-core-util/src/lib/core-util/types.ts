export type NotUndefined =
  | object
  | string
  | number
  | boolean
  | null
  | NotUndefined[];

export type UnknownRecord = Record<string, unknown>;
export type AnyRecord = Record<string, any>;
