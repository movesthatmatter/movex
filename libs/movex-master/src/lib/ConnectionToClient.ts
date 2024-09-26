import {
  AnyAction,
  EventEmitter,
  IOEvents,
  MovexClientInfo,
  SanitizedMovexClient,
} from 'movex-core-util';

export class ConnectionToClient<
  TState,
  TAction extends AnyAction,
  TResourceType extends string,
  TClientInfo extends MovexClientInfo
> {
  // public latencyMs: number = 0;

  // public clientClockOffset: number = 0;

  constructor(
    public emitter: EventEmitter<IOEvents<TState, TAction, TResourceType>>,
    public client: SanitizedMovexClient<TClientInfo>
  ) {}

  async setReady() {
    await this.syncClocks();

    this.emitter.emit('onReady', this.client);
  }

  async syncClocks() {
    const requestAt = new Date().getTime();

    // console.log('Sync clock', this.client.id, { requestAt });

    return this.emitter
      .emitAndAcknowledge('onClockSync', undefined)
      .then((res) => {
        if (res.err) {
          // console.log('Sync clock err', this.client.id);
          console.error(res.err);
          return;
        }

        // TODO: This might not be correct - also not sure if this
        // it is roughly based on the NTP protocol as described here https://stackoverflow.com/a/15785110/2093626
        //  but adjusted for movex - the math might be wrong
        // this.latencyMs = requestTime / 2;

        const responseAt = new Date().getTime();
        const requestTime = responseAt - requestAt;
        const clientTimeAtRequest = res.val;

        this.client.clockOffset =
          clientTimeAtRequest - new Date().getTime() - requestTime;

        // console.log('Sync clock ok', this.client.id, {
        //   requestAt,
        //   responseAt,
        //   requestTime,
        //   clientTimeAtRequest,
        //   clientClockOffset: this.client.clockOffset,
        // });
      });
  }
}
