import { IOPayloadResult, ResourceIdentifier } from 'movex-core-util';
import { Checksum } from '../core-types';
import { MovexStoreItem } from '../movex-store';
import {
  ActionOrActionTupleFromAction,
  AnyAction,
  CheckedReconciliatoryActions,
  ToCheckedAction,
} from '../tools/action';

export type IOEvents<
  TState extends any = any,
  A extends AnyAction = AnyAction,
  TResourceType extends string = string
> = {
  ping: () => IOPayloadResult<void, unknown>;
  pong: () => IOPayloadResult<void, unknown>;
  createResource: (p: {
    resourceType: TResourceType;
    resourceState: TState;
    // clientId: MovexClient['id']; // Needed?
  }) => IOPayloadResult<
    {
      rid: MovexStoreItem<TState, TResourceType>['rid'];
      state: MovexStoreItem<TState, TResourceType>['state'];
    },
    unknown // Type this
  >;

  // This doesn't subscribe a client to the resource' updates
  // But adds the client to the Resource list of subscribers
  addResourceSubscriber: (p: {
    rid: ResourceIdentifier<TResourceType>;
  }) => IOPayloadResult<
    void,
    unknown // Type this
  >;
  removeResourceSubscriber: (p: {
    rid: ResourceIdentifier<TResourceType>;
  }) => IOPayloadResult<
    void,
    unknown // Type this
  >;

  getResourceState: (p: {
    rid: ResourceIdentifier<TResourceType>;
  }) => IOPayloadResult<
    MovexStoreItem<TState, TResourceType>['state'],
    unknown // Type this
  >;

  emitActionDispatch: (payload: {
    rid: ResourceIdentifier<TResourceType>;
    action: ActionOrActionTupleFromAction<A>;
  }) => IOPayloadResult<
    | {
        reconciled?: false;
        nextChecksum: Checksum;
      }
    | ({
        reconciled: true;
      } & CheckedReconciliatoryActions<A>),
    'MasterResourceInexistent' | string
  >; // Type the other errors

  fwdAction: (
    payload: {
      rid: ResourceIdentifier<TResourceType>;
    } & ToCheckedAction<A>
  ) => IOPayloadResult<void, unknown>;
  reconciliateActions: (
    payload: {
      rid: ResourceIdentifier<TResourceType>;
    } & CheckedReconciliatoryActions<A>
  ) => IOPayloadResult<void, unknown>;
};
