/**
 * The Role of the reducer is to update a resource (like a Game or Match State) based on actions.
 * Just like redux, it receive, the prev state, an action with it's payload.
 * It returns the next state
 *
 * It is meant to run both on the client and the server, and it will (ideally) be the only thing that
 *  the server needs to know (and since it's running on the client as well it isn't really server code)
 */

import { GenericClientResource, StringKeys } from 'movex-core-util';
import { MovexState } from './core-types';
import {
  Action,
  ActionCreatorsMapBase,
  ActionFromActionCreator,
  ActionOrActionTuple,
  ActionsCollectionMapBase,
  AnyActionOrActionTupleOf,
  createActionCreator,
  PrivateAction,
  PublicAction,
} from './tools/action';

// export type NativeActionsCollectionMap = {
//   $canReconcile: undefined;
// };

// export type ActionDispatcher<TAction extends GenericAction> = (
//   type: TAction['type'],
//   payload: TAction['payload']
// ) => void;

// export type MovexReducerMapWithoutNative<
//   TState extends MovexState,
//   ActionsCollectionMap extends ActionsCollectionMapBase
// > = Partial<{
//   [k in StringKeys<ActionsCollectionMap>]: (
//     state: TState,
//     action: Action<k, ActionsCollectionMap[k]>
//   ) => TState;
// }>;

// export type MovexReducerMap<
//   TState extends MovexState,
//   ActionsCollectionMap extends ActionsCollectionMapBase
// > = MovexReducerMapWithoutNative<TState, ActionsCollectionMap> &
//   Partial<NativeMovexReducerMap<TState>>;

// export type NativeMovexReducerMap<TState extends MovexState> = {
//   $canReconcile: (
//     state: TState,
//     action: {
//       type: '$canReconcile';
//       payload: undefined;
//     }
//   ) => boolean;
// };

// export type GenericMovexReducerMap = MovexReducerMap<
//   GenericClientResource,
//   ActionsCollectionMapBase
// >;

// export type ResourceAndChecksum<
//   TResource extends GenericResource | GenericClientResource
// > = {
//   resource: TResource;

//   // This is the TResource['item']'s checksum
//   checksum: string;
// };

// export type StateAndChecksum<T> = {
//   state: T;
//   checksum: string;
// };
