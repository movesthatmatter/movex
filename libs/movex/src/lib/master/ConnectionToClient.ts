import { Emitter, MovexClient } from 'movex-core-util';
import { IOConnection } from '../io-connection/io-connection';
import { AnyAction } from '../tools/action';
import { IOEvents } from '../io-connection/io-events';

export class ConnectionToClient<
  TState extends any,
  TAction extends AnyAction,
  TResourceType extends string
> implements IOConnection<TState, TAction, TResourceType>
{
  constructor(
    public clientId: MovexClient['id'],
    public emitter: Emitter<IOEvents<TState, TAction, TResourceType>>
  ) {}
}
