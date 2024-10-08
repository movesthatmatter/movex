import {
  AnyAction,
  EventEmitter,
  UnsubscribeFn,
  IOEvents,
  globalLogsy,
  EmptyFn,
} from 'movex-core-util';
import { PromiseDelegate } from 'promise-delegate';
import { Pubsy } from 'ts-pubsy';
import { getRandomInt, getUuid } from './util';

const logsy = globalLogsy.withNamespace('MockConnectionEmitter');

const delay = (ms: number) =>
  new Promise((resolve) => {
    logsy.debug(`Emit() delayed for ${ms} ms!`);

    setTimeout(resolve, ms);
  });

export class MockConnectionEmitter<
  TState extends any = any,
  TAction extends AnyAction = AnyAction,
  TResourceType extends string = string
> implements EventEmitter<IOEvents<TState, TAction, TResourceType>>
{
  private mainPubsy = new Pubsy<{
    [E in keyof IOEvents<TState, TAction, TResourceType>]: {
      content: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0];
      ackCb?: (
        response: ReturnType<
          IOEvents<TState, TAction, TResourceType>[keyof IOEvents]
        >
      ) => void;
    };
  }>();

  private connectionPubsy = new Pubsy<{
    onConnect: undefined;
    onDisconnect: undefined;
  }>();

  private onEmittedPubsy = new Pubsy<{
    onEmitted: {
      event: keyof IOEvents;
      payload: Parameters<
        IOEvents<TState, TAction, TResourceType>[keyof IOEvents]
      >[0];
      // ackId?: string;

      ackCb?: (
        response: ReturnType<
          IOEvents<TState, TAction, TResourceType>[keyof IOEvents]
        >
      ) => void;
    };
    onEmitAck: {
      event: keyof IOEvents;
      payload: Parameters<
        IOEvents<TState, TAction, TResourceType>[keyof IOEvents]
      >[0];
    };
  }>();

  private _id = getRandomInt(0, 99999);

  private canEmit = new PromiseDelegate<string>();

  private emitDelay = 0;

  constructor(
    private clientId: string,
    public emitterLabel: string = String(getRandomInt(10000, 99999))
  ) {
    // Resolve by default
    this.canEmit.resolve(`c:${this._id}`);

    setTimeout(() => {
      // Connect right away
      this.connectionPubsy.publish('onConnect', undefined);
    }, 0);
  }

  on<E extends keyof IOEvents<TState, TAction, TResourceType>>(
    event: E,
    listener: (
      p: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0],
      onAck: (
        res: ReturnType<IOEvents<TState, TAction, TResourceType>[E]>
      ) => void
    ) => void
  ) {
    this.mainPubsy.subscribe(event, (req) => {
      // TODO: Add ability to unsubscribe
      listener(req.content, (res) => {
        if (req.ackCb) {
          req.ackCb(res);
        }
      });
    });

    return this;
  }

  // This is just an easier way to "on" that returns an ubsubscriber
  // For an easier API when needed (especially in tests)
  subscribe<E extends keyof IOEvents<TState, TAction, TResourceType>>(
    event: E,
    listener: (
      p: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0],
      onAck: (
        res: ReturnType<IOEvents<TState, TAction, TResourceType>[E]>
      ) => void
    ) => void
  ): UnsubscribeFn {
    this.on(event, listener);

    return () => {
      this.off(event, listener);
    };
  }

  off<E extends keyof IOEvents<TState, TAction, TResourceType>>(
    event: E,
    listener: (
      p: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0],
      ack: (r: ReturnType<IOEvents<TState, TAction, TResourceType>[E]>) => void
    ) => void
  ) {
    return this;
  }

  // This is a function existent only on the Mocker
  _onEmitted<E extends keyof IOEvents>(
    fn: (
      p: {
        event: E;
        payload: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0];
        // ackId?: string;
      },
      ackCb?: (
        response: ReturnType<IOEvents<TState, TAction, TResourceType>[E]>
      ) => void
    ) => void
  ) {
    return this.onEmittedPubsy.subscribe('onEmitted', (r) => {
      fn(
        {
          event: r.event as E,
          payload: r.payload as Parameters<
            IOEvents<TState, TAction, TResourceType>[E]
          >[0],
        },
        r.ackCb
      );
    });
  }

  _onEmitAck<E extends keyof IOEvents>(
    fn: (p: {
      event: E;
      payload: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0];
    }) => void
  ) {
    return this.onEmittedPubsy.subscribe('onEmitAck', (r) => {
      fn({
        event: r.event as E,
        payload: r.payload as Parameters<
          IOEvents<TState, TAction, TResourceType>[E]
        >[0],
      });
    });
  }

  _publish<E extends keyof IOEvents>(
    event: E,
    payload: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0],

    // TODO: Is this needed here?
    // ackId?: string
    ackCb?: (
      response: ReturnType<IOEvents<TState, TAction, TResourceType>[E]>
    ) => void
  ) {
    this.mainPubsy.publish(event, {
      content: payload as any,
      ...(ackCb && {
        ackCb: (res: any) => ackCb(res),
      }),
      // ackId,
      // what ab the ack?
    } as any);
  }

  emit<E extends keyof IOEvents<TState, TAction, TResourceType>>(
    event: E,
    request: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0],
    acknowledgeCb?: (
      response: ReturnType<IOEvents<TState, TAction, TResourceType>[E]>
    ) => void
  ) {
    this.canEmit.promise
      .then(() => (this.emitDelay > 0 ? delay(this.emitDelay) : undefined))
      .then(() => {
        this.onEmittedPubsy.publish('onEmitted', {
          event,
          payload: request,
          ...(acknowledgeCb && {
            ackCb: (r: any) => {
              this.onEmittedPubsy.publish('onEmitAck', {
                event,
                payload: r,
              });

              return acknowledgeCb(r);
            },
          }),
        });
      });

    return true;
  }

  emitAndAcknowledge<E extends keyof IOEvents<TState, TAction, TResourceType>>(
    event: E,
    request: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0]
  ) {
    return new Promise<ReturnType<IOEvents<TState, TAction, TResourceType>[E]>>(
      (resolve) => {
        this.emit(event, request, resolve);
      }
    );
  }

  disconnect(): void {
    // TODO: What should this do here??
    // Implement
  }

  onConnect(fn: () => void) {
    return this.connectionPubsy.subscribe('onConnect', fn);
  }

  onDisconnect(fn: () => void) {
    return this.connectionPubsy.subscribe('onDisconnect', fn);
  }

  // A way to pause the client-master connection so I can test the intermediary(pending) states
  _pauseEmit() {
    this.canEmit = new PromiseDelegate();
  }

  _resumeEmit() {
    if (!this.canEmit.settled) {
      this.canEmit.resolve(`p:${this._id}`);
    }

    logsy.warn(
      '[MovexConnectionEmitter] canEmit PromiseDelegate is already settled!'
    );
  }

  _setEmitDelay(ms: number) {
    if (ms >= 0) {
      this.emitDelay = ms;
    }
  }
}
