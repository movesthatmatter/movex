import { StringKeys } from 'movex-core-util';
import { MovexState } from '../core-types';
import { Action, ActionCreatorsMapBase, createActionCreator } from './action';
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
    [k in StringKeys<ActionsCreatorsMap>]: ActionsCreatorsMap[k];
  };
  reducer: TReducerMap;
  // $canPublicizePrivateState: (state: TState) => boolean;
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

export type ResourceFileCollectionMapBase = {
  [k in string]: GenericResourceFileOfType<k>;
};

// export type ResourceFileListBase =

// export const createResourceFile =
//   <
//     TName extends string,
//     TState extends MovexState,
//     ActionCreatorsMap extends ActionCreatorsMapBase
//   >(
//     name: TName,
//     defaultState: TState,
//     actions: ActionCreatorsMap
//   ) =>
//   <TReducer extends MovexReducerFromActionsMap<TState, ActionCreatorsMap>>(
//     reducer: TReducer
//     // $canPublicizePrivateState: (state: TState) => boolean = () => false
//   ) => ({
//     name,
//     defaultState,
//     actions,
//     reducer,
//     // $canPublicizePrivateState,
//   });

// export type ActionCreatorsMapBase = {
//   [k in string]: ReturnType<typeof createActionCreator>;
// };

// export type MovexReducerFromActionsMapLocal<
//   TState extends MovexState,
//   ActionsCollectionMap extends {
//     [k in string]: any;
//   }
// > = {
//   [k in StringKeys<ActionsCollectionMap>]: (
//     state: TState,
//     actionPayload: ActionsCollectionMap[k]
//   ) => TState;
// };

// export const createResourceFile2 = <
//   TName extends string,
//   TState extends MovexState,
//   TReducer extends MovexReducerFromActionsMapLocal<
//     TState,
//     ActionCreatorsMapBase
//   >
//   // ActionCreatorsMap extends ActionCreatorsMapBase
// >(
//   // defaultState: TState,
//   reducer: TReducer,
//   name?: TName
// ) => ({
//   name,
//   // defaultState,
//   reducer,
//   // $canPublicizePrivateState,
// });

// type Actions = Action<'incrementBy', number>;

// createResourceReducer(
//   { counter: 0 },
//   (state: State, action: Actions) => {
//     return state;

//     // return {
//     //   increment: (payload: number) => {
//     //     return state;
//     //   },
//     // };
//   }
//   // {
//   //   increment: (state, payload: number) => {
//   //     return state;
//   //   },
//   // }
// );

// createResourceFile(
//   'asd',
//   { count: 0 },
//   {
//     increment: createActionCreator(
//       'asd',
//       (resolve) => (a: { a: number }) => resolve(a)
//     ),
//   }
// )({
//   increment: (state, action) => {
//     return state;
//   },
// });
