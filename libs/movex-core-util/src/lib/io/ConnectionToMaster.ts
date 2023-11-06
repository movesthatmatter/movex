import type { AnyAction } from '../action';
import { BaseConnection } from './BaseConnection';

export class ConnectionToMaster<
  TState,
  TAction extends AnyAction,
  TResourceType extends string
> extends BaseConnection<TState, TAction, TResourceType> {}
