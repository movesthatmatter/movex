import { keyInObject } from './misc';

export type ResultError<
  Of extends {
    type: string;
    reason: string;
    content?: unknown;
  } = { type: string; reason: string; content?: unknown }
> = Of['content'] extends undefined
  ? {
      type: Of['type'];
      reason: Of['reason'];
      content: undefined;
    }
  : {
      type: Of['type'];
      reason: Of['reason'];
      content: Of['content'];
    };

export type UnknownResultError = ResultError<{
  type: string;
  reason: string;
  content: unknown;
}>;

export type GenericResultError<TType extends string> = ResultError<{
  type: TType;
  reason: 'GenericError';
  content: unknown;
}>;

export const isResultError = (
  e: unknown
): e is ResultError<{ type: string; reason: string }> =>
  e !== null &&
  typeof e === 'object' &&
  keyInObject(e, 'kind') &&
  typeof e.kind === 'string' &&
  keyInObject(e, 'reason') &&
  typeof e.reason === 'string';

export const isResultErrorOfKind = <K extends string, R extends string, C>(
  type: K,
  e: ResultError<{ type: K; reason: string; content?: unknown }>
): e is ResultError<{ type: K; reason: R; content: C }> =>
  isResultError(e) && e.type === type;

export const isResultErrorOfKindAndReason = <
  K extends string,
  R extends string,
  C
>(
  type: K,
  reason: R,
  e: ResultError<{ type: K; reason: R; content?: unknown }>
): e is ResultError<{ type: K; reason: R; content: C }> =>
  isResultErrorOfKind(type, e) && e.reason === reason;

export const buildResultError = <
  K extends string,
  R extends string,
  C = undefined
>(
  type: K,
  reason: R,
  content?: C
): ResultError<{ type: K; reason: R; content: C }> => ({
  type,
  reason,
  content: content || (undefined as any),
});

export const toResultError = <E extends UnknownResultError>(
  type: E['type'],
  reason: E['reason'],
  content: E['content']
) => buildResultError(type, reason, content);

export function resultError<T extends string, R extends string>(
  type: T,
  reason: R
): { type: T; reason: R };
export function resultError<T extends string, R extends string, C = any>(
  type: T,
  reason: R,
  content: C
): {
  type: T;
  reason: R;
  content: C;
};
export function resultError<T extends string, R extends string, C = any>(
  type: T,
  reason: R,
  content?: C
) {
  return {
    type,
    reason,
    content,
  };
}
