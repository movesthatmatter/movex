import { StringKeys } from 'movex-core-util';
import { MovexState } from '../core-types';
import { ActionCreatorsMapBase, ActionFromActionCreator } from './action';
import { MovexReducerFromActionsMap } from './reducer';

export type ResourceFile<
  TResourceName extends string,
  TState extends MovexState,
  ActionsCreatorsMap extends ActionCreatorsMapBase, // This could be inferred from the reducer
  TReducerMap extends MovexReducerFromActionsMap<
    TState,
    ActionsCreatorsMap
  > = MovexReducerFromActionsMap<TState, ActionsCreatorsMap>
> = {
  name: TResourceName;
  defaultState: TState;
  actions: {
    [k in StringKeys<ActionsCreatorsMap>]: (
      state: TState,
      action: ActionFromActionCreator<ActionsCreatorsMap[k]>
    ) => TState;
  };
  reducer: TReducerMap;
  $canPublicizePrivateState: (state: TState) => boolean;
};

export type GenericResourceFile = ResourceFile<
  string,
  MovexState,
  ActionCreatorsMapBase
>;

export type GenericResourceFileOfType<TType extends string> = ResourceFile<
  TType,
  MovexState,
  ActionCreatorsMapBase
>;

export type ResourceFileCollectionBase = {
  [k in string]: GenericResourceFileOfType<k>;
};

export const createResourceFile =
  <
    TName extends string,
    TState extends MovexState,
    ActionCreatorsMap extends ActionCreatorsMapBase
  >(
    name: TName,
    defaultState: TState,
    actions: ActionCreatorsMap
  ) =>
  <TReducer extends MovexReducerFromActionsMap<TState, ActionCreatorsMap>>(
    reducer: TReducer
  ) => ({
    name,
    defaultState,
    actions,
    reducer,
  });
