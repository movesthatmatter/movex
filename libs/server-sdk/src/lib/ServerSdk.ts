import io from 'socket.io-client';
import { Socket } from 'socket.io-client';
import { Pubsy } from 'ts-pubsy';
import { ServerSdkIO } from '../io';
import {
  AnySessionResourceCollectionMap,
  OnlySessionCollectionMapOfResourceKeys,
  ResourceIdentifier,
  SessionClient,
  SessionResource,
  SessionStoreCollectionMap,
  UnknownRecord,
  UnknwownSessionResourceCollectionMap,
  WsResponseResultPayload,
} from './types';
import { objectKeys, UnidentifiableModel } from 'relational-redis-store';
import { AsyncResult, AsyncResultWrapper } from 'ts-async-results';
import { Err, Ok } from 'ts-results';

// This is what creates the bridge between the seshy api
// server and the client's server via sockets

type Events = ServerSdkIO.MsgToResponseMap;

export class ServerSDK<
  ClientInfo extends UnknownRecord = {},
  ResourceCollectionMap extends UnknwownSessionResourceCollectionMap = AnySessionResourceCollectionMap,
  SessionCollectionMap extends SessionStoreCollectionMap<ResourceCollectionMap> = SessionStoreCollectionMap<ResourceCollectionMap>,
  SessionCollectionMapOfResourceKeys extends OnlySessionCollectionMapOfResourceKeys<ResourceCollectionMap> = OnlySessionCollectionMapOfResourceKeys<ResourceCollectionMap>
> {
  private socket?: Socket;

  private pubsy = new Pubsy<Events>();

  private logger: typeof console;

  constructor(
    private config: {
      url: string;
      apiKey: string;
      logger?: typeof console;
      waitForResponseMs?: number;
    }
  ) {
    this.logger = config.logger || console;
    this.config.waitForResponseMs = this.config.waitForResponseMs || 15 * 1000;
  }

  async connect() {
    const socket = io(this.config.url, {
      reconnectionDelay: 1000,
      reconnection: true,
      transports: ['websocket'],
      agent: false,
      upgrade: true,
      rejectUnauthorized: false,
      query: {
        apiKey: this.config.apiKey, // This could change
      },
    });

    this.socket = socket;

    return new Promise((resolve: (socket: Socket) => void) => {
      socket.on('connect', () => {
        this.handleIncomingMessage(socket);
        resolve(socket);

        this.logger.info('[ServerSdk] Connected Succesfully');
      });
    });
  }

  private handleIncomingMessage(socket: Socket) {
    objectKeys(ServerSdkIO.msgs).forEach((key) => {
      socket.on(
        ServerSdkIO.msgs[key].res,
        (res: WsResponseResultPayload<any, unknown>) => {
          if (res.ok) {
            this.pubsy.publish(key, res.val);
          }
        }
      );
    });
  }

  disconnect() {
    this.socket?.close();
  }

  on = this.pubsy.subscribe.bind(this.pubsy);

  // TODO: This will be able to proxy all of the events
  // onAll() {}

  // This are message that wait for a response
  // private emitAndWaitForResponse(topic: string, msg?: unknown) {
  //   this.socket?.emit(topic, msg);
  // }

  // Client

  // TODO: here add an inference or something to check if the p.info is defined in the
  //  generic, and if it is it becomes required, not optional!
  createClient(req: { id?: SessionClient['id']; info?: ClientInfo } = {}) {
    return this.emitAndAcknowledgeClients('createClient', req);

    // this.logger.info('[ServerSdk] createClient Request:', req);

    // return new AsyncResultWrapper<SessionClient, any>( // TODO: Fix this error type
    //   new Promise((resolve) => {
    //     this.socket?.emit(
    //       ServerSdkIO.msgs.createClient.req,
    //       req,
    //       (res: any) => {
    //         this.logger.info(
    //           '[ServerSdk] createClient:',
    //           req,
    //           '> Response:',
    //           res
    //         );
    //         resolve(res);
    //       }
    //     );
    //   })
    // );

    // TODO: This must return a requestId, which will be used in the onResponse
  }

  getClient(id: SessionClient['id']) {
    return this.emitAndAcknowledgeClients('getClient', { id });

    // this.logger.info('[ServerSdk] getClient Request:', id);

    // return new AsyncResultWrapper(
    //   new Promise((resolve) => {
    //     this.socket?.emit(
    //       ServerSdkIO.msgs.getClient.req,
    //       { id },
    //       (res: any) => {
    //         this.logger.info('[ServerSdk] getClient:', id, '> Response:', res);
    //         resolve(res);
    //       }
    //     );
    //   })
    // );
  }

  removeClient(id: SessionClient['id']) {
    return this.emitAndAcknowledgeClients('removeClient', { id });

    // const req = { id };
    // this.logger.info('[ServerSdk] removeClient Request:', req);

    // return new AsyncResultWrapper<SessionClient, any>( // TODO: Fix this error type
    //   new Promise((resolve) => {
    //     // TODO: Create a new function for emit that takes in the correct payloads and types them
    //     this.socket?.emit(
    //       ServerSdkIO.msgs.removeClient.req,
    //       req,
    //       (res: any) => {
    //         this.logger.info(
    //           '[ServerSdk] removeClient:',
    //           req,
    //           '> Response:',
    //           res
    //         );
    //         resolve(res);
    //       }
    //     );
    //   })
    // );
  }

  // getClients = this.sessionStore.getAllClients.bind(this.sessionStore);

  // getAllClients = this.sessionStore.getAllClients.bind(this.sessionStore);

  // updateClient = this.sessionStore.updateClient.bind(this.sessionStore);

  // // Resource

  createResource<
    TResourceType extends SessionCollectionMapOfResourceKeys,
    TResourceData extends UnidentifiableModel<
      SessionCollectionMap[TResourceType]['data']
    >
  >(req: {
    resourceType: TResourceType;
    resourceData: TResourceData;
    resourceId?: SessionResource['id'];
  }) {
    return this.emitAndAcknowledgeResources('createResource', {
      resourceIdentifier: {
        resourceType: req.resourceType,
        resourceId: req.resourceId,
      },
      resourceData: req.resourceData,
    });

    // this.logger.info('[ServerSdk] createResource Request:', req);

    // return new AsyncResultWrapper<
    //   ResourceCollectionMap[TResourceType],
    //   any // TODO: Fix this error type
    // >(
    //   new Promise((resolve) => {
    //     this.socket?.emit(
    //       ServerSdkIO.msgs.createResource.req,
    //       req,
    //       (res: any) => {
    //         this.logger.info(
    //           '[ServerSdk] createResource:',
    //           req,
    //           '> Response:',
    //           res
    //         );
    //         resolve(res);
    //       }
    //     );
    //   })
    // );
  }

  updateResource<
    TResourceType extends SessionCollectionMapOfResourceKeys,
    TResourceData extends UnidentifiableModel<
      SessionCollectionMap[TResourceType]['data']
    >
  >(
    resourceIdentifier: ResourceIdentifier<TResourceType>,
    resourceData: Partial<TResourceData>
  ) {
    return this.emitAndAcknowledgeResources('updateResource', {
      resourceIdentifier,
      resourceData,
    });

    // const req = { resourceIdentifier, data };
    // this.logger.info('[ServerSdk] updateResource Request:', req);

    // return new AsyncResultWrapper<
    //   ResourceCollectionMap[TResourceType],
    //   any // TODO: Fix this error type
    // >(
    //   new Promise((resolve) => {
    //     this.socket?.emit(
    //       ServerSdkIO.msgs.updateResource.req,
    //       req,
    //       (res: any) => {
    //         this.logger.info(
    //           '[ServerSdk] updateResource:',
    //           req,
    //           '> Response:',
    //           res
    //         );
    //         resolve(res);
    //       }
    //     );
    //   })
    // );
  }

  removeResource<TResourceType extends SessionCollectionMapOfResourceKeys>(
    resourceIdentifier: ResourceIdentifier<TResourceType>
  ) {
    return this.emitAndAcknowledgeResources('removeResource', {
      resourceIdentifier,
    });

    // const req = { resourceIdentifier };
    // this.logger.info('[ServerSdk] removeResource Request:', req);

    // return new AsyncResultWrapper<
    //   ServerSdkIO.MsgToResponseMap['removeResource'],
    //   any // TODO: Fix this error type
    // >(
    //   new Promise((resolve) => {
    //     this.socket?.emit(
    //       ServerSdkIO.msgs.removeResource.req,
    //       {
    //         resourceIdentifier,
    //       },
    //       (res: any) => {
    //         this.logger.info(
    //           '[ServerSdk] removeResource:',
    //           req,
    //           '> Response:',
    //           res
    //         );
    //         resolve(res);
    //       }
    //     );
    //   })
    // );
  }

  getResource<TResourceType extends SessionCollectionMapOfResourceKeys>(
    resourceIdentifier: ResourceIdentifier<TResourceType>
  ) {
    return this.emitAndAcknowledgeResources('getResource', {
      resourceIdentifier,
    });

    // const req = { resourceIdentifier };
    // this.logger.info('[ServerSdk] getResource Request:', req);
    // // TODO: The error should come from store as well?

    // return AsyncResult.toAsyncResult(
    //   new Promise((resolve) => {
    //     this.socket?.emit(
    //       ServerSdkIO.msgs.getResource.req,
    //       resourceIdentifier,
    //       (res: any) => {
    //         this.logger.info(
    //           '[ServerSdk] getResource:',
    //           req,
    //           '> Response:',
    //           res
    //         );
    //         resolve(res);
    //       }
    //     );
    //   })
    // );

    // return new AsyncResultWrapper<
    //   ResourceCollectionMap[TResourceType],
    //   any // TODO: Fix this error type
    // >(

    // );
  }

  // getResourceSubscribers = this.sessionStore.getResourceSubscribers.bind(
  //   this.sessionStore
  // );

  // getClientSubscriptions = this.sessionStore.getClientSubscriptions.bind(
  //   this.sessionStore
  // );

  // Subscriptions

  subscribeToResource<TResourceType extends SessionCollectionMapOfResourceKeys>(
    clientId: SessionClient['id'],
    resourceIdentifier: ResourceIdentifier<TResourceType>
  ) {
    return this.emitAndAcknowledgeSubscriptions('subscribeToResource', {
      clientId,
      resourceIdentifier,
    });

    // const req = { clientId, resourceIdentifier };
    // this.logger.info('[ServerSdk] subscribeToResource Request:', req);

    // return new AsyncResultWrapper<
    //   {
    //     resource: ResourceCollectionMap[TResourceType];
    //     client: SessionClient;
    //   },
    //   any // TODO: Fix this error type
    // >(
    //   new Promise((resolve) =>
    //     this.socket?.emit(
    //       ServerSdkIO.msgs.subscribeToResource.req,
    //       {
    //         clientId,
    //         resourceIdentifier,
    //       },
    //       (res: any) => {
    //         this.logger.info(
    //           '[ServerSdk] subscribeToResource:',
    //           req,
    //           '> Response:',
    //           res
    //         );
    //         resolve(res);
    //       }
    //     )
    //   )
    // );
  }

  unsubscribeFromResource<
    TResourceType extends SessionCollectionMapOfResourceKeys
  >(
    clientId: SessionClient['id'],
    resourceIdentifier: ResourceIdentifier<TResourceType>
  ) {
    return this.emitAndAcknowledgeSubscriptions('unsubscribeFromResource', {
      clientId,
      resourceIdentifier,
    });

    // const req = { clientId, resourceIdentifier };
    // this.logger.info('[ServerSdk] unsubscribeFromResource Request:', req);

    // return new AsyncResultWrapper<
    //   {
    //     resource: ResourceCollectionMap[TResourceType];
    //     client: SessionClient;
    //   },
    //   any // TODO: Fix this error type
    // >(
    //   new Promise((resolve) =>
    //     this.socket?.emit(
    //       ServerSdkIO.msgs.unsubscribeFromResource.req,
    //       {
    //         clientId,
    //         resourceIdentifier,
    //       },
    //       (res: any) => {
    //         this.logger.info(
    //           '[ServerSdk] unsubscribeFromResource:',
    //           req,
    //           '> Response:',
    //           res
    //         );
    //         resolve(res);
    //       }
    //     )
    //   )
    // );
  }

  // private emitAndAcknowledgeResources

  private emitAndAcknowledgeClients = <
    K extends keyof Pick<
      typeof ServerSdkIO.msgs,
      'createClient' | 'getClient' | 'removeClient'
    >,
    TReq extends ServerSdkIO.Payloads[K]['req'],
    TRes = SessionCollectionMap['$clients']
  >(
    k: K,
    req: TReq
  ): AsyncResult<TRes, unknown> => {
    const reqId = `${k}:${String(Math.random()).slice(-5)}`;

    this.logger.info(reqId, '[ServerSdk] Request:', req);

    return AsyncResult.toAsyncResult<TRes, unknown>(
      new Promise((resolve, reject) => {
        this.socket?.emit(
          ServerSdkIO.msgs[k].req,
          req,
          withTimeout(
            (res: WsResponseResultPayload<TRes, unknown>) => {
              if (res.ok) {
                this.logger.info(reqId, '[ServerSdk] Response Ok:', res);
                resolve(new Ok(res.val));
              } else {
                this.logger.warn(reqId, '[ServerSdk] Response Err:', res);
                reject(new Err(res.val));
              }
            },
            () => {
              this.logger.warn(reqId, '[ServerSdk] Request Timeout:', req);
              reject(new Err('RequestTimeout')); // TODO This error could be typed better using a result error
            },
            this.config.waitForResponseMs
          )
        );
      }).catch((e) => e) as any
    );
  };

  private emitAndAcknowledgeResources = <
    K extends keyof Pick<
      typeof ServerSdkIO.msgs,
      'createResource' | 'getResource' | 'removeResource' | 'updateResource'
    >,
    TResourceType extends SessionCollectionMapOfResourceKeys,
    TReq extends ServerSdkIO.Payloads[K]['req'],
    TRes = SessionCollectionMap[TResourceType]
  >(
    k: K,
    req: TReq
  ): AsyncResult<TRes, unknown> => {
    const reqId = `${k}:${String(Math.random()).slice(-5)}`;

    this.logger.info(reqId, '[ServerSdk] Request:', req);

    return AsyncResult.toAsyncResult<TRes, unknown>(
      new Promise((resolve, reject) => {
        this.socket?.emit(
          ServerSdkIO.msgs[k].req,
          req,
          withTimeout(
            (res: WsResponseResultPayload<TRes, unknown>) => {
              if (res.ok) {
                this.logger.info(reqId, '[ServerSdk] Response Ok:', res.val);
                resolve(new Ok(res.val));
              } else {
                this.logger.warn(reqId, '[ServerSdk] Response Err:', res.val);
                reject(new Err(res.val));
              }
            },
            () => {
              this.logger.warn(reqId, '[ServerSdk] Request Timeout:', req);
              reject(new Err('RequestTimeout')); // TODO This error could be typed better using a result error
            },
            this.config.waitForResponseMs
          )
        );
      })
      // .catch((e) => e) as any
    );
  };

  private emitAndAcknowledgeSubscriptions = <
    K extends keyof Pick<
      typeof ServerSdkIO.msgs,
      'subscribeToResource' | 'unsubscribeFromResource'
    >,
    TResourceType extends SessionCollectionMapOfResourceKeys,
    TReq extends ServerSdkIO.Payloads[K]['req'],
    TRes = {
      resource: SessionCollectionMap[TResourceType];
      client: SessionCollectionMap['$clients'];
    }
  >(
    k: K,
    req: Omit<TReq, 'resourceType'>
  ): AsyncResult<TRes, unknown> => {
    const reqId = `${k}:${String(Math.random()).slice(-5)}`;

    this.logger.info(reqId, '[ServerSdk] Request:', req);

    return AsyncResult.toAsyncResult<TRes, unknown>(
      new Promise((resolve, reject) => {
        this.socket?.emit(
          ServerSdkIO.msgs[k].req,
          req,
          withTimeout(
            (res: WsResponseResultPayload<TRes, unknown>) => {
              if (res.ok) {
                this.logger.info(reqId, '[ServerSdk] Response Ok:', res);
                resolve(new Ok(res.val));
              } else {
                this.logger.warn(reqId, '[ServerSdk] Response Err:', res);
                reject(new Err(res.val));
              }
            },
            () => {
              this.logger.warn(reqId, '[ServerSdk] Request Timeout:', req);
              reject(new Err('RequestTimeout')); // TODO This error could be typed better using a result error
            },
            this.config.waitForResponseMs
          )
        );
      }).catch((e) => e) as any
    );
  };
}

const withTimeout = (
  onSuccess: (...args: any[]) => void,
  onTimeout: () => void,
  timeout = 15 * 1000 // 15sec
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

// const promiseToAsyncResult = <T, E>(
//   promise: Promise<T>,
//   onErr: (e: unknown) => E = (e) => e as E
// ) => {
//   return new AsyncResultWrapper<T, E>(
//     promise.then(
//       (m) => new Ok(m),
//       (e) => new Err(onErr(e))
//     )
//   );
// };
