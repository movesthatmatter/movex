// import { ResourceIdentifier } from 'movex-core-util';
// import {
//   ActionOrActionTupleFromAction,
//   AnyAction,
//   CheckedReconciliatoryActions,
//   ToCheckedAction,
// } from '../tools/action';

// export type EmitActionMsg<
//   A extends AnyAction = AnyAction,
//   TResourceType extends string = string
// > = {
//   kind: 'emitAction';
//   payload: {
//     rid: ResourceIdentifier<TResourceType>;
//     action: ActionOrActionTupleFromAction<A>;
//   };
// };

// export type FwdActionMsg<
//   A extends AnyAction = AnyAction,
//   TResourceType extends string = string
// > = {
//   kind: 'fwdAction';
//   payload: {
//     rid: ResourceIdentifier<TResourceType>;
//   } & ToCheckedAction<A>;
// };

// export type ReconciliatoryActionsMsg<
//   A extends AnyAction = AnyAction,
//   TResourceType extends string = string
// > = {
//   kind: 'reconciliatoryActions';
//   payload: {
//     rid: ResourceIdentifier<TResourceType>;
//   } & CheckedReconciliatoryActions<A>;
// };
