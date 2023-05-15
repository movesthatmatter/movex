import { Emitter, MovexClient } from '../../../../movex-core-util/src';
import { IOEvents } from './io-events';
import { AnyAction } from '../tools/action';

export interface IOConnection<
  TState extends any,
  TAction extends AnyAction,
  TResourceType extends string
> {
  clientId: MovexClient['id'];
  emitter: Emitter<IOEvents<TState, TAction, TResourceType>>;
}
