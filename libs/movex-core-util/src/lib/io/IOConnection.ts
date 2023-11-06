import type { EventEmitter } from '../EventEmitter';
import type { AnyAction } from '../action';
import type { MovexClient } from '../core-types';
import type { IOEvents } from './IOEvents';

export interface IOConnection<
  TState,
  TAction extends AnyAction,
  TResourceType extends string
> {
  clientId: MovexClient['id'];
  emitter: EventEmitter<IOEvents<TState, TAction, TResourceType>>;
}
