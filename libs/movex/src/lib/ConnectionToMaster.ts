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
  // public latencyMs: number = 0;

  constructor(
    public emitter: EventEmitter<IOEvents<TState, TAction, TResourceType>>,
    public client: SanitizedMovexClient<TClientInfo>,
  ) {
    // const lastPings: any[] = [];
    // console.log('[MOVEX] Subscribing to ping/pong');
    // emitter.on('ping', (payload) => {
    //   lastPings.push(payload);
    //   console.log('ping received, latency', payload, lastPings);
    //   // console.log('pong received, latency', payload);
    //   emitter.emit('pong' as any, payload);
    // });
    // this.emitter.on('ping', )
  }

  // syncClientMasterTime() {
  //   const requestedAt = new Date().getTime();
  //   this.emitter.emit('clock', )
  // }
}
