import { EventEmitter, MovexClient } from 'movex-core-util';
import { IOEvents } from './io-events';
import { AnyAction } from '../tools/action';

export interface IOConnection<
  TState,
  TAction extends AnyAction,
  TResourceType extends string
> {
  clientId: MovexClient['id'];
  emitter: EventEmitter<IOEvents<TState, TAction, TResourceType>>;
}
