import type {
  ActionOrActionTupleFromAction,
  AnyAction,
  CheckedReconciliatoryActions,
  ToCheckedAction,
} from '../action';
import type {
  CheckedState,
  Checksum,
  IOPayloadResult,
  ResourceIdentifier,
  ResourceIdentifierStr,
} from '../core-types';

export type IOEvents<
  TState = unknown,
  A extends AnyAction = AnyAction,
  TResourceType extends string = string
> = {
  ping: () => IOPayloadResult<void, unknown>;
  pong: () => IOPayloadResult<void, unknown>;
  createResource: (p: {
    resourceType: TResourceType;
    resourceState: TState;
    resourceId?: string;
    // clientId: MovexClient['id']; // Needed?
  }) => IOPayloadResult<
    {
      rid: ResourceIdentifierStr<TResourceType>;
      state: CheckedState<TState>;
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
    CheckedState<TState>,
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
