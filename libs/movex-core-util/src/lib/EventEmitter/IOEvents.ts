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
  SanitizedMovexClient,
} from '../core-types';
import { MovexMasterContext } from '../masterContext';
// import { MovexMasterContext } from '../reducer';

export type IOEvents<
  TState = unknown,
  A extends AnyAction = AnyAction,
  TResourceType extends string = string
> = {
  /**
   * The following events are directed from Client to Master
   * */
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
    clientInfo?: MovexClient['info'];
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
    (
      | {
          type: 'ack';
          nextChecksum: Checksum;
        }
      | {
          type: 'masterActionAck';
          // nextChecksum: Checksum;
          nextCheckedAction: ToCheckedAction<A>;
        }
      | ({
          type: 'reconciliation';
        } & CheckedReconciliatoryActions<A>)
    ) & {
      masterContext: MovexMasterContext;
    },
    'MasterResourceInexistent' | string
  >; // Type the other errors

  /**
   * The following events are directed from Master to Client
   * */
  onReady: (p: SanitizedMovexClient) => void;

  // onClockSync: (p: undefined) => IOPayloadResult<number, unknown>; // acknowledges the client timestamp

  onFwdAction: (
    payload: {
      rid: ResourceIdentifier<TResourceType>;
      masterContext: MovexMasterContext;
    } & ToCheckedAction<A>
  ) => IOPayloadResult<void, unknown>;
  onReconciliateActions: (
    payload: {
      rid: ResourceIdentifier<TResourceType>;
      masterContext: MovexMasterContext;
    } & CheckedReconciliatoryActions<A>
  ) => IOPayloadResult<void, unknown>;
  onResourceSubscriberAdded: (p: {
    rid: ResourceIdentifier<TResourceType>;
    client: SanitizedMovexClient;
    // TODO: Make required after it works
    masterContext: MovexMasterContext;
    // clientId: MovexClient['id'];
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

  // They need to be different than ping/pong because those are native to socket.io
  ping: () => IOPayloadResult<void, unknown>;
  pong: () => IOPayloadResult<void, unknown>;
};
