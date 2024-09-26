import type { Checksum, StringKeys, UnknownRecord } from './core-types';
import { isObject, keyInObject } from './misc';

// The Action type here is copied from deox https://github.com/the-dr-lazy/deox/blob/master/src/create-action.ts

// TODO: ith the new Reducer Refactoring, all of the action with collection map and generic actions can be removed I believe

/**
 * TODO: 18.08.2024 - This file needs a restructuring:
 * - there are too many types, many of them aren't used or are intersecting with others
 * - others are just confusing and create more issues in understanding (AnyAction vs GenericAction - which one is what???)
 * - others are remnants of long past times (e..g all of the action with collection map and generic actions can be removed I believe)
 */

export type BaseAction<
  TType extends string,
  TPayload = undefined
> = TPayload extends undefined
  ? { type: TType }
  : { type: TType; payload: TPayload };

// @deprecate in favor of AnyAction
export type PrivateAction<
  TType extends string,
  TPayload = undefined
> = BaseAction<TType, TPayload> & {
  isPrivate: true;
};

export type PublicAction<
  TType extends string,
  TPayload = undefined
> = BaseAction<TType, TPayload> & {
  isPrivate?: false;
};

export type MasterAction<TType extends string, TPayload = undefined> =
  | (PrivateAction<TType, TPayload> & {
      _isMaster: true; // Note: This is only meant for internal useage
    })
  | (PublicAction<TType, TPayload> & {
      _isMaster: true; // Note: This is only meant for internal useage
    });

export type Action<TType extends string, TPayload = undefined> =
  | PublicAction<TType, TPayload>
  | PrivateAction<TType, TPayload>
  | MasterAction<TType, TPayload>;

export type AnyMasterAction = MasterAction<string>;

export type ActionWithAnyPayload<TType extends string> = Action<TType, unknown>;

export type ActionsCollectionMapBase = UnknownRecord;

export type AnyPublicAction = PublicAction<string>;
export type AnyPrivateAction = PrivateAction<string>;

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
export type GenericMasterAction = MasterAction<string, unknown>;

export type GenericAction =
  | GenericPrivateAction
  | GenericPublicAction
  | GenericMasterAction;

export type AnyAction = Action<string> | GenericAction;

export type UnknownAction = Action<string, unknown>;

export type GenericActionOrActionTuple =
  | GenericPublicAction
  | [GenericPrivateAction, GenericPublicAction];

export type CheckedAction<
  TActionType extends StringKeys<ActionCollectionMap>,
  ActionCollectionMap extends ActionsCollectionMapBase
> = {
  action: ActionOrActionTuple<TActionType, ActionCollectionMap>;
  checksum: Checksum;
};

// @deprecate in favor of AnyAction
export type GenericCheckedAction = {
  action: GenericActionOrActionTuple;
  checksum: Checksum;
};

export type AnyCheckedAction = {
  action: AnyActionOrActionTuple;
  checksum: Checksum;
};

// TODO: Should this be a Tuple??
export type ToCheckedAction<TAction extends AnyAction> = {
  action: TAction;
  checksum: Checksum;
};

export type ToPrivateAction<A extends AnyAction> = A & {
  isPrivate: true;
};
export type ToPublicAction<A extends AnyAction> = A & {
  isPrivate?: false;
};

export type ToMasterAction<A extends AnyAction> = A & {
  _isMaster: true;
};

export type CheckedReconciliatoryActions<A extends AnyAction> = {
  actions: ToPublicAction<A>[];
  finalChecksum: Checksum;
  // finalState: unknown;
};

export type AnyActionTuple = [AnyPrivateAction, AnyPublicAction];

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

export type AnyActionOrActionTuple = AnyPublicAction | AnyActionTuple;

export type AnyActionOrActionTupleOf<
  ActionCollectionMap extends ActionsCollectionMapBase,
  TActionType extends StringKeys<ActionCollectionMap> = StringKeys<ActionCollectionMap>
> =
  | Action<TActionType, ActionCollectionMap[TActionType]>
  | [
      PrivateAction<TActionType, ActionCollectionMap[TActionType]>,
      PublicAction<TActionType, ActionCollectionMap[TActionType]>
    ];

export type ActionOrActionTupleFromAction<TAction extends AnyAction> =
  | ToPublicAction<TAction>
  | ActionTupleFrom<TAction>;

export type ActionFromActionCreator<
  Creator extends ReturnType<typeof createActionCreator>
> = Action<Creator['type'], Parameters<Creator>[0]>;

export type ActionCreatorsMapBase = {
  [k in string]: ReturnType<typeof createActionCreator>;
};

export type ActionTupleFrom<TAction extends AnyAction | AnyMasterAction> = [
  ToPrivateAction<TAction>,
  ToPublicAction<TAction>
];

/**
 * Minimal (type-only) action factory
 * @example
 * const clearTodos = action('[Todo] truncate');
 */
export function createAction<TType extends string>(type: TType): Action<TType>;
/**
 * Action with non-error payload factory
 * @example
 * const addTodo = ({ name, completed = false }: Todo) => action('[Todo] add', { name, completed });
 */
export function createAction<TType extends string, TPayload>(
  type: TType,
  payload: TPayload
): Action<TType, TPayload>;
/**
 * Flux standard action factory
 * @example
 * const clearTodos = action('[Todo] truncate');
 * @example
 * const fetchTodosRejected = (payload: Error) => action('[Todo] fetch rejected', payload);
 * @example
 * const addTodo = ({ name, completed = false }: Todo) => action('[Todo] add', { name, completed });
 * @example
 * const fetchTodosRejected = (payload: Error, meta?: Meta) => action('[Todo] fetch rejected', payload, meta);
 * @example
 * const addTodo = ({ name, completed = false }: Todo, meta?: Meta) => action('[Todo] add', { name, completed }, meta);
 */
export function createAction<TType extends string, TPayload>(
  type: TType,
  payload?: TPayload
) {
  return {
    type,
    ...(payload !== undefined ? { payload } : {}),
    ...(payload instanceof Error ? { error: true } : {}),
  };
}

// const asdAction = createAction('asd');

// import { createAction, Action, AnyAction } from './create-action'

export type ExactActionCreator<
  TType extends string,
  TCallable extends <_T>(...args: any[]) => Action<TType>
> = TCallable & {
  type: TType extends AnyAction ? TType['type'] : TType;
  toString(): TType extends AnyAction ? TType['type'] : TType;
};

export type ActionCreator<T extends AnyAction | string> = {
  (...args: any[]): T extends string ? Action<T> : T;
  type: T extends AnyAction ? T['type'] : T;
  toString(): T extends AnyAction ? T['type'] : T;
};

export type Executor<
  TType extends string,
  TCallable extends <_T>(...args: any[]) => Action<TType>
> = (
  resolve: <Payload = undefined>(payload?: Payload) => Action<TType, Payload>
) => TCallable;

/**
 * Flux standard action creator factory
 * @example
 * createActionCreator('[Todo] truncate');
 * @example
 * createActionCreator(
 *   '[Todo] fetch rejected',
 *   resolve => (error: Error) => resolve(error)
 * );
 * @example
 * createActionCreator(
 *   '[Todo] fetch rejected',
 *   resolve => (error: Error, meta?: { status: number }) => resolve(error, meta)
 * )
 * @example
 * createActionCreator(
 *   '[Todo] add',
 *   resolve => (name: string, completed = false) => resolve({ name, completed })
 * )
 * @example
 * createActionCreator(
 *   '[Todo] add',
 *   resolve => (name: string, completed = false) => resolve({ name, completed }, 'Meta data of all todos')
 * )
 *
 */
export function createActionCreator<TType extends string>(
  type: TType
): ExactActionCreator<TType, () => Action<TType>>;
export function createActionCreator<
  TType extends string,
  TCallable extends <_T>(...args: any[]) => Action<TType>
>(
  type: TType,
  executor: Executor<TType, TCallable>
): ExactActionCreator<TType, TCallable>;
export function createActionCreator<
  TType extends string,
  TCallable extends <_T>(...args: any[]) => Action<TType>
>(
  type: TType,
  executor: Executor<TType, TCallable> = (resolve) =>
    (() => resolve()) as TCallable
) {
  const callable = executor((payload) => createAction(type, payload!));

  return Object.assign(callable, {
    type,
    toString() {
      return type;
    },
  });
}

export const isAction = (
  a: ActionOrActionTupleFromAction<AnyAction> | AnyAction
): a is AnyAction => {
  // TODO: This isn't a super thorough check, but if the input is limited
  //  to only action or ActionTuple should be enough
  return isObject(a) && keyInObject(a, 'type');
};

export const isMasterAction = (
  a: ActionOrActionTupleFromAction<AnyAction> | AnyAction
): a is AnyMasterAction => {
  // TODO: This isn't a super thorough check, but if the input is limited
  //  to only action or ActionTuple should be enough
  return isAction(a) && keyInObject(a, '_isMaster') && a._isMaster === true;
};

export const toMasterAction = <TAction extends AnyAction>(
  action: TAction
): ToMasterAction<TAction> => ({
  ...action,
  _isMaster: true,
});

export const toMasterActionFromActionOrTuple = <TAction extends AnyAction>(
  actionOrActionTuple: ActionOrActionTupleFromAction<TAction>
) => {
  return (
    isAction(actionOrActionTuple)
      ? toMasterAction(actionOrActionTuple)
      : // TODO: In the case of a tuple, there is not enough information
        //  so I'm just making them both a masterAction, but I should only make the one that is needed actually
        // - this isn't the worst possible thing as if there's nothing to parse nothing will parse
        // and the client will simply attempt to run again with the same
        [
          toMasterAction(actionOrActionTuple[0]),
          toMasterAction(actionOrActionTuple[1]),
        ]
  ) as ActionOrActionTupleFromAction<ToMasterAction<TAction>>;
};
