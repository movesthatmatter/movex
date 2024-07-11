import type { AnyAction } from '../action';
import { MovexClientInfo } from '../core-types';
import { BaseConnection } from './BaseConnection';

export class ConnectionToClient<
  TState,
  TAction extends AnyAction,
  TResourceType extends string,
  TClientInfo extends MovexClientInfo
> extends BaseConnection<TState, TAction, TResourceType, TClientInfo> {
  // This needs to be called right away as the connection gets created
  // TODO: Might consider moving into the constructor
  emitClientId() {
    this.emitter.emit('setClientId', this.clientId);
  }

  emitClientReady() {
    this.emitter.emit('onClientReady', {
      id: this.clientId,
      info: this.clientInfo,
    });
  }
}
