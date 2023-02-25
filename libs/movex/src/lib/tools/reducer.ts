import { StringKeys } from 'movex-core-util';
import { MovexState } from '../core-types';
import {
  Action,
  ActionCreatorsMapBase,
  ActionFromActionCreator,
  ActionsCollectionMapBase,
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

export type MovexReducer = <
  TState extends MovexState,
  Action extends { type: string; payload?: unknown }
>(
  state: TState,
  action: Action
) => TState;
