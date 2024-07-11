import type { EventEmitter } from '../EventEmitter';
import type { AnyAction } from '../action';
import type { MovexClient, MovexClientInfo } from '../core-types';
import type { IOConnection } from './IOConnection';
import type { IOEvents } from './IOEvents';

export class BaseConnection<
  TState,
  TAction extends AnyAction,
  TResourceType extends string,
  TClientInfo extends MovexClientInfo
> implements IOConnection<TState, TAction, TResourceType>
{
  constructor(
    public clientId: MovexClient['id'],
    public emitter: EventEmitter<IOEvents<TState, TAction, TResourceType>>,
    public clientInfo: TClientInfo = {} as TClientInfo
  ) {}
}
