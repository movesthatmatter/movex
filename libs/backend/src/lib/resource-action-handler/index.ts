// This will be crated by the backend

// import {
//   ActionsCollectionMapBase,
//   GenericResource,
//   ResourceActionsHandler,
// } from '@matterio/core-util';

// // And the client SDK most likely but in a diff way
// export const registerResourceReducer = <
//   TResource extends GenericResource,
//   ActionsCollectionMap extends ActionsCollectionMapBase,
//   TState extends TResource['item'] = TResource['item']
// >(
//   initialState: TState,

//   // This gets passed in from the backend (the code that lives on both client and server)
//   actionsHandler: ResourceActionsHandler<
//     TResource,
//     ActionsCollectionMap,
//     TState
//   >,

//   // Gets called on the backend
//   onUpdate?: (nextState: TState) => void
// ) => {
//   // let nextState: TState = resource.item as TState;
//   let nextState = initialState;

//   const dispatch = <TActionType extends keyof ActionsCollectionMap>(
//     type: TActionType,
//     payload: ActionsCollectionMap[TActionType]
//   ) => {
//     const handlerFn = actionsHandler[type];
//     if (!handlerFn) {
//       return;
//     }

//     nextState = handlerFn(nextState, { type, payload });
//     onUpdate?.(nextState);
//   };

//   return dispatch;
// };
