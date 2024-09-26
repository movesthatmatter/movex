import type {
  AnyAction,
  EventEmitter,
  IOEvents,
  MovexClientInfo,
  SanitizedMovexClient,
} from 'movex-core-util';

export class ConnectionToMaster<
  TState,
  TAction extends AnyAction,
  TResourceType extends string,
  TClientInfo extends MovexClientInfo
> {
  constructor(
    public emitter: EventEmitter<IOEvents<TState, TAction, TResourceType>>,
    public client: SanitizedMovexClient<TClientInfo>
  ) {}
}
