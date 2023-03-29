import { MovexClient } from 'movex-core-util';
import { AsyncResult } from 'ts-async-results';
import { CheckedState, Checksum, UnsubscribeFn } from '../core-types';
import {
  ActionOrActionTupleFromAction,
  AnyAction,
  CheckedReconciliatoryActions,
  ToCheckedAction,
} from '../tools/action';

// Questoin: Should this be Generic or Per Resource?

export interface MovexIO {
  clientId?: MovexClient['id'];

  connect(): void;

  disconnect(): void;

  onConnect(fn: (p: { clientId: MovexClient['id'] }) => void): UnsubscribeFn;

  onDisconnect(fn: () => void): UnsubscribeFn;

  emitAction(
    actionOrActionTuple: ActionOrActionTupleFromAction<AnyAction>
  ): AsyncResult<Checksum, unknown>; // Returns the Ack Checksum

  onFwdAction<TAction extends AnyAction>(
    fn: (p: ToCheckedAction<TAction>) => void
  ): UnsubscribeFn;

  onReconciliatoryActions<TAction extends AnyAction>(
    fn: (p: CheckedReconciliatoryActions<TAction>) => void
  ): UnsubscribeFn;

  // This should know hot to use the ClientId at implementatino level
  get(): AsyncResult<CheckedState<any>, unknown>;

  // TODO: These not sure we need, or at least not in the same way as before?! :/

  // create(): AsyncResult<TState, unknown>;

  // remove(): AsyncResult<void, unknown>;

  // update(): AsyncResult<TState, unknown>;

  // createResource<
  //   TResourceType extends SessionCollectionMapOfResourceKeys,
  //   TResourceData extends UnidentifiableModel<
  //     SessionCollectionMap[TResourceType]
  //   >
  // >(req: {
  //   resourceType: TResourceType;
  //   resourceData: TResourceData;
  //   resourceId?: GenericResource['id'];
  // }) {
  //   return this.emitAndAcknowledgeResources('createResource', {
  //     resourceIdentifier: {
  //       resourceType: req.resourceType,
  //       resourceId: req.resourceId,
  //     },
  //     resourceData: req.resourceData,
  //   });
  // }

  // updateResource<
  //   TResourceType extends SessionCollectionMapOfResourceKeys,
  //   TResourceData extends ResourceCollectionMap[TResourceType]
  // >(
  //   resourceIdentifier: ResourceIdentifier<TResourceType>,
  //   resourceData: Partial<UnidentifiableModel<TResourceData>>
  // ) {
  //   return this.emitAndAcknowledgeResources('updateResource', {
  //     resourceIdentifier,
  //     resourceData,
  //   });
  // }

  // removeResource<TResourceType extends SessionCollectionMapOfResourceKeys>(
  //   resourceIdentifier: ResourceIdentifier<TResourceType>
  // ) {
  //   return this.emitAndAcknowledgeResources('removeResource', {
  //     resourceIdentifier,
  //   });
  // }

  // getResource<TResourceType extends SessionCollectionMapOfResourceKeys>(
  //   resourceIdentifier: ResourceIdentifier<TResourceType>
  // ) {
  //   return this.emitAndAcknowledgeResources('getResource', {
  //     resourceIdentifier,
  //   });
  // }

  // onClientDisconnect() {}
}

// export interface IOMaster {}
