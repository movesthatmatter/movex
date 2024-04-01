import type {
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
  ConnectionToMaster,
} from 'movex-core-util';
import {
  invoke,
  toResourceIdentifierObj,
  toResourceIdentifierStr,
} from  'movex-core-util';
import { Pubsy } from 'ts-pubsy';
import { AsyncResult } from 'ts-async-results';
import { Err, Ok } from 'ts-results';

/**
 * This handles the connection with Master per ResourceType
 */
export class ConnectionToMasterResource<
  TState,
  TAction extends AnyAction,
  TResourceType extends string
> {
  private fwdActionPubsy = new Pubsy<{
    [key in `rid:${ResourceIdentifierStr<TResourceType>}`]: ToCheckedAction<TAction>;
  }>();

  private reconciliatoryActionPubsy = new Pubsy<{
    [key in `rid:${ResourceIdentifierStr<TResourceType>}`]: CheckedReconciliatoryActions<TAction>;
  }>();

  private unsubscribers: UnsubscribeFn[] = [];

  constructor(
    resourceType: TResourceType,
    private connectionToMaster: ConnectionToMaster<
      TState,
      TAction,
      TResourceType
    >
  ) {
    const onFwdActionHandler = (
      p: {
        rid: ResourceIdentifier<TResourceType>;
      } & ToCheckedAction<TAction>
    ) => {
      if (toResourceIdentifierObj(p.rid).resourceType !== resourceType) {
        return;
      }

      this.fwdActionPubsy.publish(`rid:${toResourceIdentifierStr(p.rid)}`, p);
    };

    const onReconciliateActionsHandler = (
      p: {
        rid: ResourceIdentifier<TResourceType>;
      } & CheckedReconciliatoryActions<TAction>
    ) => {
      if (toResourceIdentifierObj(p.rid).resourceType !== resourceType) {
        return;
      }

      this.reconciliatoryActionPubsy.publish(
        `rid:${toResourceIdentifierStr(p.rid)}`,
        p
      );
    };

    const onRemoveResourceSubscriber = () => {

    }

    connectionToMaster.emitter.on(
      'onReconciliateActions',
      onReconciliateActionsHandler
    );

    connectionToMaster.emitter.on('onFwdAction', onFwdActionHandler);

    connectionToMaster.emitter.on('onResourceSubscriberRemoved', onRemoveResourceSubscriber);

    // Unsubscribe from the events too
    this.unsubscribers = [
      () => connectionToMaster.emitter.off('onFwdAction', onFwdActionHandler),
      () =>
        connectionToMaster.emitter.off(
          'onReconciliateActions',
          onReconciliateActionsHandler
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
        .then((res) =>
          res.ok
            ? new Ok({
                // This sanitizes the data only allowing specific fields to get to the client
                // TODO: This actually should come sanitized from the server, since this is on the client
                // Probably best to where the ack is called
                rid: res.val.rid,
                state: res.val.state,
              })
            : new Err(res.val)
        )
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
        })
        .then((res) => (res.ok ? new Ok(res.val) : new Err(res.val)))
    );
  }

  get(rid: ResourceIdentifier<TResourceType>) {
    type GetEvent = ReturnType<
      IOEvents<TState, TAction, TResourceType>['getResourceState']
    >;

    return AsyncResult.toAsyncResult<
      GetIOPayloadOKTypeFrom<GetEvent>,
      GetIOPayloadErrTypeFrom<GetEvent>
    >(
      this.connectionToMaster.emitter
        .emitAndAcknowledge('getResourceState', { rid })
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
    rid: ResourceIdentifier<TResourceType>,
    fn: (p: ToCheckedAction<TAction>) => void
  ) {
    return this.fwdActionPubsy.subscribe(
      `rid:${toResourceIdentifierStr(rid)}`,
      fn
    );
  }

  onReconciliatoryActions(
    rid: ResourceIdentifier<TResourceType>,
    fn: (p: CheckedReconciliatoryActions<TAction>) => void
  ) {
    return this.reconciliatoryActionPubsy.subscribe(
      `rid:${toResourceIdentifierStr(rid)}`,
      fn
    );
  }

  destroy() {
    this.unsubscribers.forEach(invoke);
  }
}
