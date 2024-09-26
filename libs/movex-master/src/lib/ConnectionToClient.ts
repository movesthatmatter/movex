import {
  AnyAction,
  EventEmitter,
  IOEvents,
  MovexClientInfo,
  SanitizedMovexClient,
} from 'movex-core-util';

export class ConnectionToClient<
  TState,
  TAction extends AnyAction,
  TResourceType extends string,
  TClientInfo extends MovexClientInfo
> {
  constructor(
    public emitter: EventEmitter<IOEvents<TState, TAction, TResourceType>>,
    public client: SanitizedMovexClient<TClientInfo>
  ) {}

  emitClientReady() {
    this.emitter.emit('onClientReady', this.client);
  }
}
