import { EventEmitter, MovexClient } from 'movex-core-util';
import { IOConnection } from '../io-connection/io-connection';
import { AnyAction } from '../tools/action';
import { IOEvents } from '../io-connection/io-events';

export class ConnectionToClient<
  TState,
  TAction extends AnyAction,
  TResourceType extends string
> implements IOConnection<TState, TAction, TResourceType>
{
  constructor(
    public clientId: MovexClient['id'],
    public emitter: EventEmitter<IOEvents<TState, TAction, TResourceType>>
  ) {}
}
