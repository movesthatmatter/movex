import {
  AnyResourceIdentifier,
  ClientResource,
  MovexClient,
  MovexStore,
  MovexStoreItem,
} from 'movex-core-util';
import { AsyncResult } from 'ts-async-results';
import { UnsubscribeFn } from '../core-types';
import {
  EmitActionMsg,
  FwdActionMsg,
  ReconciliatoryActionsMsg,
} from './movexIO-payloads';

type ReceiveMsg = FwdActionMsg | ReconciliatoryActionsMsg;

type SendMsg = EmitActionMsg;

export interface MovexIOMasterConnection {
  clientId: MovexClient['id'];

  onMessage: (
    fn: (
      msg: ReceiveMsg,
      acknowledgeFn: (ackPayload: any) => void // The ackPayload here can be typed
    ) => void
  ) => UnsubscribeFn;
  send: (msg: SendMsg) => void;

  // Extra

  getResourceState<TState extends any>(
    rid: AnyResourceIdentifier,
    clientId: MovexClient['id']
  ): AsyncResult<MovexStoreItem<TState>['state'], unknown>;
}
