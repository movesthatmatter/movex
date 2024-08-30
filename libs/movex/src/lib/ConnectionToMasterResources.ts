import {
  GetIOPayloadErrTypeFrom,
  GetIOPayloadOKTypeFrom,
  ResourceIdentifier,
  ResourceIdentifierStr,
  ActionOrActionTupleFromAction,
  AnyAction,
  CheckedReconciliatoryActions,
  ToCheckedAction,
  UnsubscribeFn,
  IOEvents,
  MovexClient,
  SanitizedMovexClient,
  objectOmit,
  objectPick,
} from 'movex-core-util';
import {
  invoke,
  toResourceIdentifierObj,
  toResourceIdentifierStr,
} from 'movex-core-util';
import { Pubsy } from 'ts-pubsy';
import { AsyncResult } from 'ts-async-results';
import { Err, Ok } from 'ts-results';
import { ConnectionToMaster } from './ConnectionToMaster';

/**
 * This handles the connection with Master per ResourceType
 */
export class ConnectionToMasterResources<
  TState,
  TAction extends AnyAction,
  TResourceType extends string
> {
  private fwdActionEventPubsy = new Pubsy<{
    // [key in `rid:${ResourceIdentifierStr<TResourceType>}`]: ToCheckedAction<TAction>;
    [key in `rid:${ResourceIdentifierStr<TResourceType>}`]: Parameters<
      IOEvents<TState, TAction, TResourceType>['onFwdAction']
    >[0];
  }>();

  private reconciliatoryActionEventPubsy = new Pubsy<{
    [key in `rid:${ResourceIdentifierStr<TResourceType>}`]: Parameters<
      IOEvents<TState, TAction, TResourceType>['onReconciliateActions']
    >[0];
  }>();

  private subscriberAddedEventPubsy = new Pubsy<{
    [key in `rid:${ResourceIdentifierStr<TResourceType>}`]: SanitizedMovexClient;
  }>();

  private subscriberRemovedEventPubsy = new Pubsy<{
    [key in `rid:${ResourceIdentifierStr<TResourceType>}`]: MovexClient['id'];
  }>();

  private unsubscribers: UnsubscribeFn[] = [];

  constructor(
    resourceType: TResourceType,
    private connectionToMaster: ConnectionToMaster<
      TState,
      TAction,
      TResourceType,
      {} // Fix
    >
  ) {
    const onFwdActionHandler = (
      p: Parameters<IOEvents<TState, TAction, TResourceType>['onFwdAction']>[0]
    ) => {
      if (toResourceIdentifierObj(p.rid).resourceType !== resourceType) {
        return;
      }

      this.fwdActionEventPubsy.publish(
        `rid:${toResourceIdentifierStr(p.rid)}`,
        p
      );
    };

    const onReconciliateActionsHandler = (
      p: Parameters<
        IOEvents<TState, TAction, TResourceType>['onReconciliateActions']
      >[0]
    ) => {
      if (toResourceIdentifierObj(p.rid).resourceType !== resourceType) {
        return;
      }

      this.reconciliatoryActionEventPubsy.publish(
        `rid:${toResourceIdentifierStr(p.rid)}`,
        p
      );
    };

    // TODO: Refactor this to take the Parametrs of IOEvents
    const onRemoveResourceSubscriberHandler = (p: {
      rid: ResourceIdentifier<TResourceType>;
      clientId: MovexClient['id'];
    }) => {
      if (toResourceIdentifierObj(p.rid).resourceType !== resourceType) {
        return;
      }

      this.subscriberRemovedEventPubsy.publish(
        `rid:${toResourceIdentifierStr(p.rid)}`,
        p.clientId
      );
    };
    const onAddResourceSubscriberHandler = (p: {
      rid: ResourceIdentifier<TResourceType>;
      client: SanitizedMovexClient;
    }) => {
      if (toResourceIdentifierObj(p.rid).resourceType !== resourceType) {
        return;
      }

      this.subscriberAddedEventPubsy.publish(
        `rid:${toResourceIdentifierStr(p.rid)}`,
        objectPick(p.client, ['clockOffset', 'id', 'info'])
      );
    };

    connectionToMaster.emitter.on(
      'onReconciliateActions',
      onReconciliateActionsHandler
    );

    connectionToMaster.emitter.on('onFwdAction', onFwdActionHandler);

    connectionToMaster.emitter.on(
      'onResourceSubscriberRemoved',
      onRemoveResourceSubscriberHandler
    );

    connectionToMaster.emitter.on(
      'onResourceSubscriberAdded',
      onAddResourceSubscriberHandler
    );

    // Unsubscribe from the events too
    this.unsubscribers = [
      () => connectionToMaster.emitter.off('onFwdAction', onFwdActionHandler),
      () =>
        connectionToMaster.emitter.off(
          'onReconciliateActions',
          onReconciliateActionsHandler
        ),
      () =>
        connectionToMaster.emitter.off(
          'onResourceSubscriberRemoved',
          onRemoveResourceSubscriberHandler
        ),
      () =>
        connectionToMaster.emitter.off(
          'onResourceSubscriberAdded',
          onAddResourceSubscriberHandler
        ),
    ];
  }

  create(
    resourceType: TResourceType,
    resourceState: TState,
    resourceId?: string // Sometimes the id of the resource must be given from outside
  ) {
    type CreateEvent = ReturnType<
      IOEvents<TState, TAction, TResourceType>['createResource']
    >;
    return AsyncResult.toAsyncResult<
      GetIOPayloadOKTypeFrom<CreateEvent>,
      GetIOPayloadErrTypeFrom<CreateEvent>
    >(
      this.connectionToMaster.emitter
        .emitAndAcknowledge('createResource', {
          // clientId: this.connectionToMaster.clientId,
          resourceState,
          resourceType,
          resourceId,
        })
        .then((res) => (res.ok ? new Ok(res.val) : new Err(res.val)))
    );
  }

  addResourceSubscriber(rid: ResourceIdentifier<TResourceType>) {
    type AddSubscriberEvent = ReturnType<
      IOEvents<TState, TAction, TResourceType>['addResourceSubscriber']
    >;
    return AsyncResult.toAsyncResult<
      GetIOPayloadOKTypeFrom<AddSubscriberEvent>,
      GetIOPayloadErrTypeFrom<AddSubscriberEvent>
    >(
      this.connectionToMaster.emitter
        .emitAndAcknowledge('addResourceSubscriber', {
          rid,
          clientInfo: this.connectionToMaster.client.info,
        })
        .then((res) => (res.ok ? new Ok(res.val) : new Err(res.val)))
    );
  }

  getState(rid: ResourceIdentifier<TResourceType>) {
    type GetStateEvent = ReturnType<
      IOEvents<TState, TAction, TResourceType>['getResourceState']
    >;
    return AsyncResult.toAsyncResult<
      GetIOPayloadOKTypeFrom<GetStateEvent>,
      GetIOPayloadErrTypeFrom<GetStateEvent>
    >(
      this.connectionToMaster.emitter
        .emitAndAcknowledge('getResourceState', { rid })
        .then((res) => (res.ok ? new Ok(res.val) : new Err(res.val)))
    );
  }

  getSubscribers(rid: ResourceIdentifier<TResourceType>) {
    type GetSubscribersEvent = ReturnType<
      IOEvents<TState, TAction, TResourceType>['getResourceSubscribers']
    >;

    return AsyncResult.toAsyncResult<
      GetIOPayloadOKTypeFrom<GetSubscribersEvent>,
      GetIOPayloadErrTypeFrom<GetSubscribersEvent>
    >(
      this.connectionToMaster.emitter
        .emitAndAcknowledge('getResourceSubscribers', { rid })
        .then((res) => (res.ok ? new Ok(res.val) : new Err(res.val)))
    );
  }

  getResource(rid: ResourceIdentifier<TResourceType>) {
    type GetResourceEvent = ReturnType<
      IOEvents<TState, TAction, TResourceType>['getResource']
    >;

    return AsyncResult.toAsyncResult<
      GetIOPayloadOKTypeFrom<GetResourceEvent>,
      GetIOPayloadErrTypeFrom<GetResourceEvent>
    >(
      this.connectionToMaster.emitter
        .emitAndAcknowledge('getResource', { rid })
        .then((res) => (res.ok ? new Ok(res.val) : new Err(res.val)))
    );
  }

  emitAction(
    rid: ResourceIdentifier<TResourceType>,
    actionOrActionTuple: ActionOrActionTupleFromAction<TAction>
  ) {
    type EmitActionEvent = ReturnType<
      IOEvents<TState, TAction, TResourceType>['emitActionDispatch']
    >;

    return AsyncResult.toAsyncResult<
      GetIOPayloadOKTypeFrom<EmitActionEvent>,
      GetIOPayloadErrTypeFrom<EmitActionEvent>
    >(
      this.connectionToMaster.emitter
        .emitAndAcknowledge('emitActionDispatch', {
          rid,
          action: actionOrActionTuple,
        })
        .then((res) => (res.ok ? new Ok(res.val) : new Err(res.val)))
    );
  }

  onFwdAction(
    // p: Parameters<IOEvents['onFwdAction']>[0],
    rid: ResourceIdentifier<TResourceType>,
    // fn: (p: ToCheckedAction<TAction>) => void
    fn: (
      p: Parameters<IOEvents<TState, TAction, TResourceType>['onFwdAction']>[0]
    ) => void
  ) {
    return this.fwdActionEventPubsy.subscribe(
      `rid:${toResourceIdentifierStr(rid)}`,
      fn
    );
  }

  onReconciliatoryActions(
    rid: ResourceIdentifier<TResourceType>,
    fn: (
      p: Parameters<
        IOEvents<TState, TAction, TResourceType>['onReconciliateActions']
      >[0]
    ) => void
  ) {
    return this.reconciliatoryActionEventPubsy.subscribe(
      `rid:${toResourceIdentifierStr(rid)}`,
      fn
    );
  }

  onSubscriberAdded(
    rid: ResourceIdentifier<TResourceType>,
    fn: (clientId: SanitizedMovexClient) => void
  ) {
    return this.subscriberAddedEventPubsy.subscribe(
      `rid:${toResourceIdentifierStr(rid)}`,
      fn
    );
  }

  onSubscriberRemoved(
    rid: ResourceIdentifier<TResourceType>,
    fn: (clientId: MovexClient['id']) => void
  ) {
    return this.subscriberRemovedEventPubsy.subscribe(
      `rid:${toResourceIdentifierStr(rid)}`,
      fn
    );
  }

  destroy() {
    this.unsubscribers.forEach(invoke);
  }
}
