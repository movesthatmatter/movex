export type ResultError<
  Of extends {
    kind: string;
    reason: string;
    content?: unknown;
  }
> = Of;

export type UnknownResultError = ResultError<{
  kind: string;
  reason: string;
  content: unknown;
}>;

// Use this to get inherited keys as well
export const keyInObject = <X extends {}, Y extends PropertyKey>(
  obj: X,
  prop: Y
): obj is X & Record<Y, unknown> => prop in obj;

export const isResultError = (
  e: unknown
): e is ResultError<{ kind: string; reason: string }> =>
  e !== null &&
  typeof e === 'object' &&
  keyInObject(e, 'kind') &&
  typeof e.kind === 'string' &&
  keyInObject(e, 'reason') &&
  typeof e.reason === 'string';

export const isResultErrorOfKind = <
  K extends string,
  R extends string,
  C extends unknown
>(
  kind: K,
  e: ResultError<{ kind: K; reason: string; content?: unknown }>
): e is ResultError<{ kind: K; reason: R; content: C }> =>
  isResultError(e) && e.kind === kind;

export const isResultErrorOfKindAndReason = <
  K extends string,
  R extends string,
  C extends unknown
>(
  kind: K,
  reason: R,
  e: ResultError<{ kind: K; reason: R; content?: unknown }>
): e is ResultError<{ kind: K; reason: R; content: C }> =>
  isResultErrorOfKind(kind, e) && e.reason === reason;

export const buildResultError = <
  K extends string,
  R extends string,
  C extends unknown = undefined
>(
  kind: K,
  reason: R,
  content?: C
): ResultError<{ kind: K; reason: R; content: C }> => ({
  kind,
  reason,
  content: content || (undefined as any),
});

// export const toResultError = <E extends UnknownResultError>(
//   kind: E['kind'],
//   reason: E['reason'],
//   content?: E['content']
// ) => buildResultError(kind, reason, content);

// export const toResultErrorOfKind = <E extends UnknownResultError>(
//   kind: E['kind']
// ) => {
//   return <R extends string, C extends unknown = undefined>(
//     reason: R,
//     content?: C
//   ) => toResultError(kind, reason, content);
// };
