import { IOPayloadResult, ResourceIdentifier } from 'movex-core-util';
import { Checksum } from '../core-types';
import { MovexStoreItem } from '../master-store';
import {
  ActionOrActionTupleFromAction,
  AnyAction,
  CheckedReconciliatoryActions,
  ToCheckedAction,
} from '../tools/action';

export type MasterClientIOEvents<
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
      id: MovexStoreItem<TState>['id'];
      state: MovexStoreItem<TState>['state'];
      // This is just so it works with rid as well
      rid: ResourceIdentifier<TResourceType>;
    },
    unknown // Type this
  >;

  getResourceState: (p: {
    rid: ResourceIdentifier<TResourceType>;
  }) => IOPayloadResult<
    MovexStoreItem<TState>['state'],
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
