// import * as RRStore from 'relational-redis-store';
// import { ResultError } from '../ResultErrors';
// import { buildResultError } from '../ResultErrors';

// export type SessionErrorOfReason<
//   TReason extends string,
//   TContent extends unknown = unknown
// > = ResultError<{
//   kind: 'ServerSDKError';
//   reason: TReason;
//   content: TContent;
// }>;

// export type GenericSessionErrorOfStoreReasons =
//   SessionErrorOfReason<RRStore.StoreErrors>;

// export type CreatePeerError = GenericSessionErrorOfStoreReasons;
// export type RemovePeerError = GenericSessionErrorOfStoreReasons;
// export type GetPeerError = GenericSessionErrorOfStoreReasons;

// export type CreateTopicError = GenericSessionErrorOfStoreReasons;
// export type SubscribeToTopicError = GenericSessionErrorOfStoreReasons;
// export type UnsubscribeToTopicError = GenericSessionErrorOfStoreReasons;

// export type GetTopicSubscribersError = GenericSessionErrorOfStoreReasons;
// export type GetPeerSubscriptions = GenericSessionErrorOfStoreReasons;

// export const toSessionError = <
//   TReason extends string,
//   TContent extends unknown = unknown
// >(
//   reason: TReason,
//   content?: unknown
// ) =>
//   buildResultError('ServerSDKError', reason, content) as SessionErrorOfReason<
//     TReason,
//     TContent
//   >;
