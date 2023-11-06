import type { AnyAction } from '../action';
import { BaseConnection } from './BaseConnection';

export class ConnectionToClient<
  TState,
  TAction extends AnyAction,
  TResourceType extends string
> extends BaseConnection<TState, TAction, TResourceType> {}

console.log('ConnectionToClient class', ConnectionToClient);