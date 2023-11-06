import type { EventEmitter, MovexClient, AnyAction } from 'movex-core-util';
import type { IOConnection } from './IOConnection';
import type { IOEvents } from './IOEvents';

export class BaseConnection<
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
