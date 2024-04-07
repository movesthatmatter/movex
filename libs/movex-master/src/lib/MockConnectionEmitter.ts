import {
  AnyAction,
  EventEmitter,
  UnsubscribeFn,
  IOEvents,
  globalLogsy,
} from 'movex-core-util';

import { Pubsy } from 'ts-pubsy';
import { getRandomInt, getUuid } from './util';

const logsy = globalLogsy.withNamespace('MockConnectionEmitter');

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

  private ackPubsy = new Pubsy<{
    [ackId in string]: undefined;
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
  }>();

  constructor(
    private clientId: string,
    public emitterLabel: string = String(getRandomInt(10000, 99999))
  ) {}

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
    const unsub = this.onEmittedPubsy.subscribe('onEmitted', (r) => {
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

    return () => {
      unsub();
    };
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
        ackCb: (res: any) => {
          ackCb(res);
        },
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
    if (acknowledgeCb) {
      const ackId = getUuid();

      // TODO: Need a way for this to call the unsubscriber
      this.ackPubsy.subscribe(ackId, (ackMsg) => {
        logsy.log('Emit', {
          event,
          request,
          response: ackMsg,
        });

        acknowledgeCb(
          ackMsg as ReturnType<IOEvents<TState, TAction, TResourceType>[E]>
        );
      });

      this.onEmittedPubsy.publish('onEmitted', {
        event,
        payload: request,
        ackCb: acknowledgeCb as any,
      });
    } else {
      this.onEmittedPubsy.publish('onEmitted', {
        event,
        payload: request,
      });
    }

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
}
