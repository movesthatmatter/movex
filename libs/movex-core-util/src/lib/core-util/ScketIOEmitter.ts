import { Err, Ok } from 'ts-results';
import { Socket as ServerSocket } from 'socket.io';
import { Socket as ClientSocket } from 'socket.io-client';
import { EventMap } from 'typed-emitter';
import { Pubsy } from 'ts-pubsy';
import { EventEmitter, UnsubscribeFn } from './EventEmitter';
import { logsy } from './Logsy';
import { WsResponseResultPayload } from '../core-types';

export type SocketIO = ServerSocket | ClientSocket;

export class SocketIOEmitter<TEventMap extends EventMap>
  implements EventEmitter<TEventMap>
{
  private pubsy = new Pubsy<{
    onReceivedClientId: string;
  }>();

  private logger: typeof console;
  constructor(
    private socket: SocketIO,
    private config: {
      logger?: typeof console;
      waitForResponseMs?: number;
    } = {}
  ) {
    this.logger = config.logger || console;
    this.config.waitForResponseMs = this.config.waitForResponseMs || 15 * 1000;

    // This might need to be moved from here into the master connection or somewhere client specific!
    this.socket.onAny((ev, clientId) => {
      if (ev === '$setClientId' && typeof clientId === 'string') {
        this.pubsy.publish('onReceivedClientId', clientId);
      }
    });
  }

  onReceivedClientId(fn: (clientId: string) => void) {
    return this.pubsy.subscribe('onReceivedClientId', fn);
  }

  on<E extends keyof TEventMap>(
    event: E,
    listener: (
      p: Parameters<TEventMap[E]>[0],
      ack?: (r: ReturnType<TEventMap[E]>) => void
    ) => void
  ): this {
    // logsy.debug('[SocketEmitter] subscribed to:', event);

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
    // logsy.debug('[SocketEmitter] unsubscribed to:', event);

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
    logsy.debug('[ServerSocketEmitter]', reqId, 'Emit:', event, request);

    this.socket.emit(
      event as string,
      request,
      acknowledgeCb &&
        withTimeout(
          (res: WsResponseResultPayload<unknown, unknown>) => {
            if (res.ok) {
              logsy.debug('[ServerSocketEmitter]', reqId, 'Response Ok:', res);
              acknowledgeCb(new Ok(res.val) as ReturnType<TEventMap[E]>);
            } else {
              logsy.warn('[ServerSocketEmitter]', reqId, 'Response Err:', res);
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
    return new Promise(async (resolve, reject) => {
      const reqId = `${event as string}(${String(Math.random()).slice(-3)})`;
      logsy.debug(
        '[ServerSocketEmitter]',
        reqId,
        'EmitAndAcknowledge:',
        event,
        request
      );

      this.socket.emit(
        event as string,
        request,
        withTimeout(
          (res: WsResponseResultPayload<unknown, unknown>) => {
            if (res.ok) {
              logsy.debug('[ServerSocketEmitter]', reqId, 'Response Ok:', res);
              resolve(new Ok(res.val));
            } else {
              logsy.warn('[ServerSocketEmitter]', reqId, 'Response Err:', res);
              reject(new Err(res.val));
            }
          },
          () => {
            logsy.warn(
              '[ServerSocketEmitter]',
              event,
              'Request Timeout:',
              request
            );
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
