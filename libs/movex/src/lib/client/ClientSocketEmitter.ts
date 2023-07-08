import {
  EventEmitter,
  MovexClient,
  UnsubscribeFn,
  WsResponseResultPayload,
  logsy,
} from 'movex-core-util';
import { AnyAction } from '../tools/action';
import { IOEvents } from '../io-connection/io-events';
import io, { Socket } from 'socket.io-client';
import { PromiseDelegate } from 'promise-delegate';
import { Pubsy } from 'ts-pubsy';
import { Err, Ok } from 'ts-results';

export class ClientSocketEmitter<
  TState extends any = any,
  TAction extends AnyAction = AnyAction,
  TResourceType extends string = string
> implements EventEmitter<IOEvents<TState, TAction, TResourceType>>
{
  private pubsy = new Pubsy<{
    socketConnect: { clientId: MovexClient['id'] };
    socketDisconnect: undefined;
  }>();

  private eventPubsy = new Pubsy<{
    [E in keyof IOEvents<TState, TAction, TResourceType>]: {
      content: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0];
      ackCb?: (
        response: ReturnType<
          IOEvents<TState, TAction, TResourceType>[keyof IOEvents]
        >
      ) => void;
    };
  }>();

  public io: Socket;

  private socketConnectionDelegate = new PromiseDelegate<Socket>(true);

  private logger: typeof console;

  // private unsubscriberMapFromOnEvent: Record<string, > = {};

  constructor(
    private config: {
      url: string;
      clientId?: string; // Pass in a userId or allow the SDK to generate a random one
      apiKey: string;
      logger?: typeof console;
      waitForResponseMs?: number;
    }
  ) {
    this.logger = config.logger || console;
    this.config.waitForResponseMs = this.config.waitForResponseMs || 15 * 1000;

    const socketConfig = {
      reconnectionDelay: 1000,
      reconnection: true,
      transports: ['websocket'],
      agent: false,
      upgrade: true,
      rejectUnauthorized: false,
      query: {
        ...(config.clientId ? { clientId: config.clientId } : {}),
        apiKey: this.config.apiKey, // This could change
      },
      // autoConnect: false,
    };

    this.io = config.url ? io(this.config.url, socketConfig) : io(socketConfig);

    // this.socketInstance = io(socketConfig);

    let unsubscribeOnSocketDisconnnect: Function[] = [];

    // this.socketInstance.on('connect', () => {
    //   // unsubscribeOnSocketDisconnnect = [
    //   //   ...this.handleConnection(this.socketInstance),
    //   // ];
    // });

    // TODO: This was moved out of the on"connect" since the docs say not to register on msg events there
    //  but outside
    this.handleClientConnection(this.io);

    this.io.on('connect', () => {
      this.pubsy.publish('socketConnect', {
        clientId: 'given from here ',
      });
    });

    // this.socketInstance.on('event', () => {});

    this.io.on('disconnect', () => {
      this.pubsy.publish('socketDisconnect', undefined);

      // TODO: add delegate
      this.socketConnectionDelegate = new PromiseDelegate<Socket>(true);

      // TODO: Test that the unsubscribptions work correctly
      unsubscribeOnSocketDisconnnect.forEach((unsubscribe) => unsubscribe());
    });
  }

  private handleClientConnection(socket: Socket) {
    const unsubscribers: Function[] = [];

    // TODO: Type this with zod
    const $clientConnectHandler = (payload: { clientId: string }) => {
      logsy.info('[ClientSdk] Connected Succesfully', payload);

      // Resolve the socket promise now!
      this.socketConnectionDelegate.resolve(this.io);

      this.pubsy.publish('socketConnect', payload);
    };

    // TODO: Type the EventName
    socket.on('$clientConnected', $clientConnectHandler);
    unsubscribers.push(() =>
      socket.off('$clientConnected', $clientConnectHandler)
    );

    return unsubscribers;
  }

  private get socketConnection() {
    return this.socketConnectionDelegate.promise;
  }

  on<E extends keyof IOEvents<TState, TAction, TResourceType>>(
    event: E,
    cb: (
      p: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0],
      ack?: (r: ReturnType<IOEvents<TState, TAction, TResourceType>[E]>) => void
    ) => void
  ): this {
    this.socketConnection.then((socket: Socket) => {
      // socket.on(event, (p) => {
      // });
      // socket.on(event, () => {})
      const updateResourceHandler = (
        res: WsResponseResultPayload<
          Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0],
          unknown
        >
      ) => {
        if (res.ok) {
          cb(res.val as any, () => {});
          // listener(res.val as any, () => {

          // })

          // // TODO: Add ability to unsubscribe
          // listener(req.content, (res) => {
          //   if (req.ackCb) {
          //     req.ackCb(res);
          //   }
          // });
          // this.pubsy.publish('updateResource', res.val);
        }
      };

      // socket.on(event, (p) => {

      // });

      // socket.on(event, updateResourceHandler);

      // unsubscribers.push(() =>
      //   socket.off(event, updateResourceHandler)
      // );
    });

    // this.eventPubsy.subscribe(event, (req) => {
    //   // TODO: Add ability to unsubscribe
    //   listener(req.content, (res) => {
    //     if (req.ackCb) {
    //       req.ackCb(res);
    //     }
    //   });
    // });

    return this;
  }

  off<E extends keyof IOEvents<TState, TAction, TResourceType>>(
    event: E,
    listener: (
      p: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0],
      ack: (r: ReturnType<IOEvents<TState, TAction, TResourceType>[E]>) => void
    ) => void
  ): this {
    return this;
  }

  subscribe<E extends keyof IOEvents<TState, TAction, TResourceType>>(
    event: E,
    listener: (
      p: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0],
      ack: (r: ReturnType<IOEvents<TState, TAction, TResourceType>[E]>) => void
    ) => void
  ): UnsubscribeFn {
    // this.on(event, listener);

    return () => {
      // this.off(event, listener);
    };
  }

  emit<E extends keyof IOEvents<TState, TAction, TResourceType>>(
    event: E,
    request: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0],
    acknowledgeCb?:
      | ((
          response: ReturnType<IOEvents<TState, TAction, TResourceType>[E]>
        ) => void)
      | undefined
  ): boolean {
    this.emitAndAcknowledge(event, request).then((p) => {
      if (acknowledgeCb) {
        acknowledgeCb(p);
      }
    });

    return false;
  }

  emitAndAcknowledge<E extends keyof IOEvents<TState, TAction, TResourceType>>(
    event: E,
    request: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0]
  ): Promise<ReturnType<IOEvents<TState, TAction, TResourceType>[E]>> {
    return new Promise(async (resolve, reject) => {
      const reqId = `${event}(${String(Math.random()).slice(-3)})`;
      const connection = await this.socketConnection;

      connection.emit(
        event,
        request,
        withTimeout(
          (res: WsResponseResultPayload<unknown, unknown>) => {
            if (res.ok) {
              logsy.info('[SocketEmitter]', reqId, 'Response Ok:', res);
              resolve(new Ok(res.val));
            } else {
              logsy.warn('[SocketEmitter]', reqId, 'Response Err:', res);
              reject(new Err(res.val));
            }
          },
          () => {
            logsy.warn(
              '[SocketEmitter]',
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
