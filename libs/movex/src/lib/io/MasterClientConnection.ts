import { Emitter, MovexClient } from 'movex-core-util';
import { AnyAction } from '../tools/action';
import { MasterClientIOEvents } from './MasterClientIOEvents';

export interface IMasterClientConnection<
  TState extends any,
  TAction extends AnyAction,
  TResourceType extends string
> {
  clientId: MovexClient['id'];
  emitter: Emitter<MasterClientIOEvents<TState, TAction, TResourceType>>;
}

export class MasterClientConnection<
  TState extends any,
  TAction extends AnyAction,
  TResourceType extends string
> implements IMasterClientConnection<TState, TAction, TResourceType>
{
  constructor(
    public clientId: MovexClient['id'],
    public emitter: Emitter<
      MasterClientIOEvents<TState, TAction, TResourceType>
    >
  ) {}
}
