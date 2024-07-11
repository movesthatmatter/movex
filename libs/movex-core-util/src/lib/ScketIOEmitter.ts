import { Err, Ok } from 'ts-results';
import { globalLogsy } from './Logsy';
import type { Socket as ServerSocket } from 'socket.io';
import type { Socket as ClientSocket } from 'socket.io-client';
import type { EventMap } from 'typed-emitter';
import type { EventEmitter } from './EventEmitter';
import type { UnsubscribeFn, WsResponseResultPayload } from './core-types';

export type SocketIO = ServerSocket | ClientSocket;

const logsy = globalLogsy.withNamespace('[SocketIOEmitter]');

export class SocketIOEmitter<TEventMap extends EventMap>
  implements EventEmitter<TEventMap>
{
  constructor(
    private socket: SocketIO,
    private config: {
      waitForResponseMs?: number;
    } = {}
  ) {
    this.config.waitForResponseMs = this.config.waitForResponseMs || 15 * 1000;
  }

  on<E extends keyof TEventMap>(
    event: E,
    listener: (
      p: Parameters<TEventMap[E]>[0],
      ack?: (r: ReturnType<TEventMap[E]>) => void
    ) => void
  ): this {
    this.socket.on(event as string, listener);

    return this;
  }

  off<E extends keyof TEventMap>(
    event: E,
    listener: (
      p: Parameters<TEventMap[E]>[0],
      ack?: (r: ReturnType<TEventMap[E]>) => void
    ) => void
  ): this {
    this.socket.off(event as string, listener);

    return this;
  }

  subscribe<E extends keyof TEventMap>(
    event: E,
    listener: (
      p: Parameters<TEventMap[E]>[0],
      ack?: (r: ReturnType<TEventMap[E]>) => void
    ) => void
  ): UnsubscribeFn {
    this.on(event, listener);

    return () => {
      this.off(event, listener);
    };
  }

  emit<E extends keyof TEventMap>(
    event: E,
    request: Parameters<TEventMap[E]>[0],
    acknowledgeCb?: (response: ReturnType<TEventMap[E]>) => void
  ): boolean {
    const reqId = `${event as string}(${String(Math.random()).slice(-3)})`;
    logsy.debug('Emit', { reqId, event, request });

    this.socket.emit(
      event as string,
      request,
      acknowledgeCb &&
        withTimeout(
          (res: WsResponseResultPayload<unknown, unknown>) => {
            if (res.ok) {
              logsy.debug('Emit Response Ok', { reqId, event, res });
              acknowledgeCb(new Ok(res.val) as ReturnType<TEventMap[E]>);
            } else {
              logsy.debug('Emit Response Err', { reqId, event, res });
              acknowledgeCb(new Err(res.val) as ReturnType<TEventMap[E]>);
            }
          },
          () => {
            // this.logger.warn(
            //   '[ServerSocketEmitter]',
            //   event,
            //   'Request Timeout:',
            //   request
            // );
            // // TODO This error could be typed better using a result error
            // reject(new Err('RequestTimeout'));
          },
          this.config.waitForResponseMs
        )
    );

    return false;
  }

  emitAndAcknowledge<E extends keyof TEventMap>(
    event: E,
    request: Parameters<TEventMap[E]>[0]
  ): Promise<ReturnType<TEventMap[E]>> {
    return new Promise((resolve, reject) => {
      const reqId = `${event as string}(${String(Math.random()).slice(-3)})`;
      logsy.debug('EmitAndAcknowledge', {
        reqId,
        event,
        request,
      });

      this.socket.emit(
        event as string,
        request,
        withTimeout(
          (res: WsResponseResultPayload<unknown, unknown>) => {
            if (res.ok) {
              logsy.debug('EmitAndAcknowledge Response Ok', {
                reqId,
                res,
                request,
                event,
              });
              resolve(new Ok(res.val));
            } else {
              logsy.debug('EmitAndAcknowledge Response Err', {
                reqId,
                res,
                request,
                event,
              });
              reject(new Err(res.val));
            }
          },
          () => {
            logsy.error('EmitAndAcknowledge Request Timeout', {
              reqId,
              request,
              event,
            });

            // TODO This error could be typed better using a result error
            reject(new Err('RequestTimeout'));
          },
          this.config.waitForResponseMs
        )
      );
    }).catch((e) => e) as any;
  }
}

const withTimeout = (
  onSuccess: (...args: any[]) => void,
  onTimeout: () => void,
  timeout = 15 * 1000 // 15 sec
) => {
  let called = false;

  const timer = setTimeout(() => {
    if (called) return;
    called = true;
    onTimeout();
  }, timeout);

  return (...args: any[]) => {
    if (called) {
      return;
    }

    called = true;
    clearTimeout(timer);
    onSuccess(...args);
  };
};
