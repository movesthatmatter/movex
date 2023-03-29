import { MovexClient, ResourceIdentifier } from 'movex-core-util';
import { UnsubscribeFn } from '../core-types';
import {
  EmitActionMsg,
  FwdActionMsg,
  ReconciliatoryActionsMsg,
} from './movexIO-payloads';

type ReceiveMsg = EmitActionMsg;

type SendMsg = FwdActionMsg | ReconciliatoryActionsMsg;

export interface MovexIOClientConnection {
  clientId: MovexClient['id'];
  onMessage: (
    fn: (
      msg: ReceiveMsg,
      acknowledgeFn: (ackPayload: any) => void // The ackPayload here can be typed
    ) => void
  ) => UnsubscribeFn;
  send: (msg: SendMsg) => void;
}
