import type { StringKeys } from './core-types';
import type {
  Action,
  ActionCreatorsMapBase,
  ActionFromActionCreator,
  ActionsCollectionMapBase,
  AnyAction,
} from './action';
import { MovexMasterContext } from './masterContext';

export type MovexReducerFromActionsMap<
  TState,
  ActionsCollectionMap extends ActionCreatorsMapBase
> = {
  [k in StringKeys<ActionsCollectionMap>]: (
    state: TState,
    action: ActionFromActionCreator<ActionsCollectionMap[k]>
  ) => TState;
};

export type MovexReducerMap<
  TState,
  ActionsCollectionMap extends ActionsCollectionMapBase
> = {
  [k in StringKeys<ActionsCollectionMap>]: (
    state: TState,
    action: Action<k, ActionsCollectionMap[k]>
  ) => TState;
};

// export type MovexReducer<
//   TState,
//   TAction extends AnyAction = AnyAction
// > = (state: TState, action: TAction) => TState;

// export type MovexMasterContext = {
//   // @Deprecate in favor of requestAt Props which enables purity
//   // now: () => number; // timestamp
//   requestAt: number; // timestamp
// };

export type MovexReducer<S = any, A extends AnyAction = AnyAction> = ((
  state: S,
  action: A
) => S) & {
  $canReconcileState?: (s: S) => boolean;
  $transformState?: (s: S, masterContext: MovexMasterContext) => S;
};

export type GetReducerState<
  TReducer extends (...args: any[]) => S,
  S = any
> = ReturnType<TReducer>;

export type GetReducerAction<
  TReducer extends (state: S, action: any) => S,
  S = any
> = Parameters<TReducer>[1];
