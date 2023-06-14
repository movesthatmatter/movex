import {
  EventEmitter,
  UnsubscribeFn,
  WsResponseResultPayload,
  logsy,
} from 'movex-core-util';
import { AnyAction } from '../tools/action';
import { IOEvents } from '../io-connection/io-events';
import { Err, Ok } from 'ts-results';
import { Socket } from 'socket.io';

/**
 * This gets created for each client connection
 */
export class ServerSocketEmitter<
  TState extends any = any,
  TAction extends AnyAction = AnyAction,
  TResourceType extends string = string
> implements EventEmitter<IOEvents<TState, TAction, TResourceType>>
{
  private logger: typeof console;
  constructor(
    private socket: Socket,
    private config: {
      logger?: typeof console;
      waitForResponseMs?: number;
    } = {}
  ) {
    this.logger = config.logger || console;
    this.config.waitForResponseMs = this.config.waitForResponseMs || 15 * 1000;
  }

  on<E extends keyof IOEvents<TState, TAction, TResourceType>>(
    event: E,
    listener: (
      p: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0],
      ack?: (r: ReturnType<IOEvents<TState, TAction, TResourceType>[E]>) => void
    ) => void
  ): this {
    this.socket.on(event as string, listener);

    return this;
  }

  off<E extends keyof IOEvents<TState, TAction, TResourceType>>(
    event: E,
    listener: (
      p: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0],
      ack: (r: ReturnType<IOEvents<TState, TAction, TResourceType>[E]>) => void
    ) => void
  ): this {
    this.socket.off(event, listener);

    return this;
  }

  subscribe<E extends keyof IOEvents<TState, TAction, TResourceType>>(
    event: E,
    listener: (
      p: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0],
      ack?: (r: ReturnType<IOEvents<TState, TAction, TResourceType>[E]>) => void
    ) => void
  ): UnsubscribeFn {
    this.on(event, listener);

    return () => {
      this.off(event, listener);
    };
  }

  emit<E extends keyof IOEvents<TState, TAction, TResourceType>>(
    event: E,
    request: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0],
    acknowledgeCb?: (
      response: ReturnType<IOEvents<TState, TAction, TResourceType>[E]>
    ) => void
  ): boolean {
    const reqId = `${event}(${String(Math.random()).slice(-3)})`;

    this.socket.emit(
      event,
      request,
      acknowledgeCb &&
        withTimeout(
          (res: WsResponseResultPayload<unknown, unknown>) => {
            if (res.ok) {
              logsy.info('[ServerSocketEmitter]', reqId, 'Response Ok:', res);
              acknowledgeCb(
                new Ok(res.val) as ReturnType<
                  IOEvents<TState, TAction, TResourceType>[E]
                >
              );
            } else {
              logsy.warn('[ServerSocketEmitter]', reqId, 'Response Err:', res);
              acknowledgeCb(
                new Err(res.val) as ReturnType<
                  IOEvents<TState, TAction, TResourceType>[E]
                >
              );
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

  emitAndAcknowledge<E extends keyof IOEvents<TState, TAction, TResourceType>>(
    event: E,
    request: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0]
  ): Promise<ReturnType<IOEvents<TState, TAction, TResourceType>[E]>> {
    return new Promise(async (resolve, reject) => {
      const reqId = `${event}(${String(Math.random()).slice(-3)})`;
      // const connection = await this.socketConnection;

      logsy.info('[ServerSocketEmitter]', reqId, 'Emit:', event, request);

      this.socket.emit(
        event,
        request,
        withTimeout(
          (res: WsResponseResultPayload<unknown, unknown>) => {
            if (res.ok) {
              logsy.info('[ServerSocketEmitter]', reqId, 'Response Ok:', res);
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
