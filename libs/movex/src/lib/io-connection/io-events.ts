import {
  IOPayloadResult,
  MovexClient,
  ResourceIdentifier,
} from 'movex-core-util';
import { Checksum } from '../core-types';
import { MovexStoreItem } from '../master-store';
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

  getResourceState: (p: {
    rid: ResourceIdentifier<TResourceType>;
  }) => IOPayloadResult<
    MovexStoreItem<TState, TResourceType>['state'],
    unknown // Type this
  >;

  emitAction: (payload: {
    rid: ResourceIdentifier<TResourceType>;
    action: ActionOrActionTupleFromAction<A>;
  }) => IOPayloadResult<Checksum, 'MasterResourceInexistent' | string>; // Type the other errors

  fwdAction: (
    payload: {
      rid: ResourceIdentifier<TResourceType>;
    } & ToCheckedAction<A>
  ) => void;
  reconciliateActions: (
    payload: {
      rid: ResourceIdentifier<TResourceType>;
    } & CheckedReconciliatoryActions<A>
  ) => void;
};
