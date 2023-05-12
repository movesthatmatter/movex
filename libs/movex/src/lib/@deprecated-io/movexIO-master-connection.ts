// import {
//   AnyResourceIdentifier,
//   MovexClient,
//   MovexStoreItem,
// } from 'movex-core-util';
// import { AsyncResult } from 'ts-async-results';
// import { UnsubscribeFn } from '../core-types';
// import { AnyAction } from '../tools/action';
// import {
//   EmitActionMsg,
//   FwdActionMsg,
//   ReconciliatoryActionsMsg,
// } from './movexIO-payloads';

// export type ReceiveMsg<
//   A extends AnyAction = AnyAction,
//   TResourceType extends string = string
// > = FwdActionMsg<A, TResourceType> | ReconciliatoryActionsMsg<A, TResourceType>;

// export type SendMsg<
//   A extends AnyAction = AnyAction,
//   TResourceType extends string = string
// > = EmitActionMsg<A, TResourceType>;

// export interface MovexIOMasterConnection<
//   TResourceType extends string = string,
//   TAction extends AnyAction = AnyAction
// > {
//   clientId: MovexClient['id'];

//   onMessage: (
//     fn: (
//       msg: ReceiveMsg<TAction>,
//       acknowledgeFn: (ackPayload: any) => void // The ackPayload here can be typed
//     ) => void
//   ) => UnsubscribeFn;

//   send: (msg: SendMsg<TAction>) => void;

//   // Extra

//   createResource<TState extends any>(
//     clientId: MovexClient['id'],
//     resourceType: TResourceType,
//     resourceState: TState
//   ): AsyncResult<
//     {
//       // rid: ResourceIdentifier<typeof resourceType>;
//       id: MovexStoreItem<TState>['id'];
//       state: MovexStoreItem<TState>['state'];
//       // This is just so it works with rid as well
//       rid: {
//         resourceId: MovexStoreItem<TState>['id'];
//         resourceType: typeof resourceType;
//       };
//     },
//     unknown
//   >;

//   getResourceState<TState extends any>(
//     rid: AnyResourceIdentifier,
//     clientId: MovexClient['id']
//   ): AsyncResult<MovexStoreItem<TState>['state'], unknown>;
// }
