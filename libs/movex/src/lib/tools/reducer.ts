import { StringKeys } from 'movex-core-util';
import { MovexState } from '../core-types';
import {
  Action,
  ActionCreatorsMapBase,
  ActionFromActionCreator,
  ActionsCollectionMapBase,
  AnyAction,
} from './action';

export type MovexReducerFromActionsMap<
  TState extends MovexState,
  ActionsCollectionMap extends ActionCreatorsMapBase
> = {
  [k in StringKeys<ActionsCollectionMap>]: (
    state: TState,
    action: ActionFromActionCreator<ActionsCollectionMap[k]>
  ) => TState;
};

export type MovexReducerMap<
  TState extends MovexState,
  ActionsCollectionMap extends ActionsCollectionMapBase
> = {
  [k in StringKeys<ActionsCollectionMap>]: (
    state: TState,
    action: Action<k, ActionsCollectionMap[k]>
  ) => TState;
};

// export type MovexReducer<
//   TState extends MovexState = MovexState,
//   TAction extends AnyAction = AnyAction
// > = (state: TState, action: TAction) => TState;

export type MovexReducer<S = any, A extends AnyAction = AnyAction> = ((
  state: S,
  action: A
) => S) & { $canReconcileState?: (s: S) => boolean };

export type GetReducerState<
  TReducer extends (...args: any[]) => S,
  S = any
> = ReturnType<TReducer>;
