import type {
  ActionOrActionTupleFromAction,
  AnyAction,
  CheckedReconciliatoryActions,
  ToCheckedAction,
} from '../action';
import type {
  CheckedState,
  Checksum,
  MovexClientResourceShape,
  IOPayloadResult,
  MovexClient,
  ResourceIdentifier,
  ResourceIdentifierStr,
} from '../core-types';

export type IOEvents<
  TState = unknown,
  A extends AnyAction = AnyAction,
  TResourceType extends string = string
> = {
  /**
   * The following events are directed from Client to Master
   * */
  setClientId: (clientId: string) => void;

  createResource: (p: {
    resourceType: TResourceType;
    resourceState: TState;
    resourceId?: string;
    // clientId: MovexClient['id']; // Needed?
  }) => IOPayloadResult<
    MovexClientResourceShape<TResourceType, TState>,
    // {
    //   rid: ResourceIdentifierStr<TResourceType>;
    //   state: CheckedState<TState>;
    // },
    unknown // Type this
  >;

  // This doesn't subscribe a client to the resource' updates
  // But adds the client to the Resource list of subscribers
  addResourceSubscriber: (p: {
    rid: ResourceIdentifier<TResourceType>;
  }) => IOPayloadResult<
    MovexClientResourceShape<TResourceType, TState>,
    unknown // Type this
  >;

  getResourceState: (p: {
    rid: ResourceIdentifier<TResourceType>;
  }) => IOPayloadResult<
    CheckedState<TState>,
    unknown // Type this
  >;

  getResourceSubscribers: (p: {
    rid: ResourceIdentifier<TResourceType>;
  }) => IOPayloadResult<
    MovexClientResourceShape<TResourceType, TState>['subscribers'],
    unknown // Type this
  >;

  getResource: (p: {
    rid: ResourceIdentifier<TResourceType>;
  }) => IOPayloadResult<
    MovexClientResourceShape<TResourceType, TState>,
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

  /**
   * The following events are directed from Master to Client
   * */

  onFwdAction: (
    payload: {
      rid: ResourceIdentifier<TResourceType>;
    } & ToCheckedAction<A>
  ) => IOPayloadResult<void, unknown>;
  onReconciliateActions: (
    payload: {
      rid: ResourceIdentifier<TResourceType>;
    } & CheckedReconciliatoryActions<A>
  ) => IOPayloadResult<void, unknown>;
  onResourceSubscriberAdded: (p: {
    rid: ResourceIdentifier<TResourceType>;
    clientId: MovexClient['id'];
  }) => IOPayloadResult<
    void,
    unknown // Type this
  >;
  onResourceSubscriberRemoved: (p: {
    rid: ResourceIdentifier<TResourceType>;
    clientId: MovexClient['id'];
  }) => IOPayloadResult<
    void,
    unknown // Type this
  >;

  /**
   * The following events are by-directional (from Client to Master and vice-versa)
   * */

  ping: () => IOPayloadResult<void, unknown>;
  pong: () => IOPayloadResult<void, unknown>;
};
