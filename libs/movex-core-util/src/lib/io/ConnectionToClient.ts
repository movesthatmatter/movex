import type { AnyAction } from '../action';
import { BaseConnection } from './BaseConnection';

export class ConnectionToClient<
  TState,
  TAction extends AnyAction,
  TResourceType extends string
> extends BaseConnection<TState, TAction, TResourceType> {
  // This needs to be called right away as the connection gets created
  // TODO: Might consider moving into the constructor
  emitClientId() {
    this.emitter.emit('setClientId', this.clientId);
  }
}
