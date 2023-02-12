/**
 * The Role of the reducer is to update a resource (like a Game or Match State) based on actions.
 * Just like redux, it receive, the prev state, an action with it's payload.
 * It returns the next state
 *
 * It is meant to run both on the client and the server, and it will (ideally) be the only thing that
 *  the server needs to know (and since it's running on the client as well it isn't really server code)
 */

import { GenericClientResource, StringKeys } from '../core-types';

export type ActionsCollectionMapBase = Record<string, unknown>;

export type Action<TType extends string, TPayload extends unknown> = {
  type: TType;
  payload: TPayload;
};

export type GenericAction = {
  type: string;
  payload: unknown;
};

export type ActionDispatcher<TAction extends GenericAction> = (
  type: TAction['type'],
  payload: TAction['payload']
) => void;

export type ResourceReducerMap<
  TResource extends GenericClientResource,
  ActionsCollectionMap extends ActionsCollectionMapBase,
  TState extends TResource['item'] = TResource['item']
> = Partial<{
  [k in StringKeys<ActionsCollectionMap>]: (
    state: TState,
    action: Action<k, ActionsCollectionMap[k]>
  ) => TState;
}>;
// & ResourceNativeActionsHandler<TResource>

export type NativeResourceReducerMap<
  TResource extends GenericClientResource
> = {
  // $canReconcile: (
  //   state: TResource['item'],
  //   action: {
  //     type: '$canReconcile';
  //     payload: undefined;
  //   }
  // ) => boolean;
};
