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

export type NativeActionsCollectionMap = {
  $canReconcile: undefined;
};

export type PrivateAction<TType extends string, TPayload extends unknown> = {
  type: TType;
  payload: TPayload;
  isPrivate: true;
};

export type PublicAction<TType extends string, TPayload extends unknown> = {
  type: TType;
  payload: TPayload;
  isPrivate?: false;
};

export type Action<TType extends string, TPayload extends unknown> =
  | PublicAction<TType, TPayload>
  | PrivateAction<TType, TPayload>;

export type AnyActionOf<
  ActionsCollectionMap extends ActionsCollectionMapBase,
  TType extends StringKeys<ActionsCollectionMap> = StringKeys<ActionsCollectionMap>
> = Action<TType, ActionsCollectionMap[TType]>;

export type AnyPrivateActionOf<
  ActionsCollectionMap extends ActionsCollectionMapBase
> = Extract<AnyActionOf<ActionsCollectionMap>, { isPrivate: true }>;

export type AnyPublicActionOf<
  ActionsCollectionMap extends ActionsCollectionMapBase
> = Exclude<
  AnyActionOf<ActionsCollectionMap>,
  AnyPrivateActionOf<ActionsCollectionMap>
>;

export type GenericPrivateAction = PrivateAction<string, unknown>;
export type GenericPublicAction = PublicAction<string, unknown>;

export type GenericAction = GenericPrivateAction | GenericPublicAction;

// export type ActionDispatcher<TAction extends GenericAction> = (
//   type: TAction['type'],
//   payload: TAction['payload']
// ) => void;

export type MovexState = Record<string, any>;

export type MovexReducerMap<
  TState extends MovexState,
  ActionsCollectionMap extends ActionsCollectionMapBase
> = Partial<
  {
    [k in StringKeys<ActionsCollectionMap>]: (
      state: TState,
      action: Action<k, ActionsCollectionMap[k]>
    ) => TState;
  } & NativeMovexReducerMap<TState>
>;

export type NativeMovexReducerMap<TState extends MovexState> = {
  $canReconcile: (
    state: TState,
    action: {
      type: '$canReconcile';
      payload: undefined;
    }
  ) => boolean;
};

export type GenericMovexReducerMap = MovexReducerMap<
  GenericClientResource,
  ActionsCollectionMapBase
>;

export type ValAndChecksum<T> = [T, string];

// export type ResourceAndChecksum<
//   TResource extends GenericResource | GenericClientResource
// > = {
//   resource: TResource;

//   // This is the TResource['item']'s checksum
//   checksum: string;
// };

export type Checksum = string;
export type CheckedState<T> = [state: T, checksum: Checksum];

// export type StateAndChecksum<T> = {
//   state: T;
//   checksum: string;
// };

export type DispatchFn = <
  TActionType extends StringKeys<ActionCollectionMap>,
  ActionCollectionMap extends ActionsCollectionMapBase
>(
  actionOrActionTuple:
    | Action<TActionType, ActionCollectionMap[TActionType]>
    | [
        PrivateAction<TActionType, ActionCollectionMap[TActionType]>,
        PublicAction<TActionType, ActionCollectionMap[TActionType]>
      ]
) => void;

export type ActionOrActionTuple<
  TActionType extends StringKeys<ActionCollectionMap>,
  ActionCollectionMap extends ActionsCollectionMapBase
> =
  | Action<TActionType, ActionCollectionMap[TActionType]>
  | [
      privateAction: PrivateAction<
        TActionType,
        ActionCollectionMap[TActionType]
      >,
      publicAction: PublicAction<TActionType, ActionCollectionMap[TActionType]>
    ];

export type AnyActionOrActionTupleOf<
  ActionCollectionMap extends ActionsCollectionMapBase,
  TActionType extends StringKeys<ActionCollectionMap> = StringKeys<ActionCollectionMap>
> =
  | Action<TActionType, ActionCollectionMap[TActionType]>
  | [
      PrivateAction<TActionType, ActionCollectionMap[TActionType]>,
      PublicAction<TActionType, ActionCollectionMap[TActionType]>
    ];

export type CheckedAction<
  TActionType extends StringKeys<ActionCollectionMap>,
  ActionCollectionMap extends ActionsCollectionMapBase
> = {
  action: ActionOrActionTuple<TActionType, ActionCollectionMap>;
  checksum: Checksum;
};

export type AnyCheckedAction<
  ActionCollectionMap extends ActionsCollectionMapBase,
  TActionType extends StringKeys<ActionCollectionMap> = StringKeys<ActionCollectionMap>
> = {
  action: AnyActionOrActionTupleOf<ActionCollectionMap, TActionType>;
  checksum: Checksum;
};

export type DispatchedEvent<
  TState,
  ActionMap extends ActionsCollectionMapBase
> = {
  next: TState;
  prev: TState;
  action: AnyActionOrActionTupleOf<ActionMap>;
};
