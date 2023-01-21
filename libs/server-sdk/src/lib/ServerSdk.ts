import io from 'socket.io-client';
import { Socket } from 'socket.io-client';
import { Pubsy } from 'ts-pubsy';
import { ServerSdkIO } from '../io';
import {
  AnyIdentifiableRecord,
  OnlySessionCollectionMapOfResourceKeys,
  ResourceClientResponse,
  ResourceIdentifier,
  ResourceResponse,
  SessionClient,
  SessionResource,
  SessionStoreCollectionMap,
  UnidentifiableModel,
  UnknownIdentifiableRecord,
  UnknownRecord,
  WsResponseResultPayload,
} from './types';
import { AsyncResult } from 'ts-async-results';
import { Err, Ok } from 'ts-results';
import { toResourceIdentifierString } from './util';

// This is what creates the bridge between the seshy api
// server and the client's server via sockets

type Events = ServerSdkIO.MsgToResponseMap;

export type ServerSDKConfig = {
  url: string;
  apiKey: string;
  logger?: typeof console;
  waitForResponseMs?: number;
};

type PubsyEvents<
  ResourceCollectionMap extends Record<string, UnknownIdentifiableRecord>
> = {
  onBroadcastToSubscribers:
    | {
        event: 'updateResource';
        subscribers: SessionResource['subscribers'];
        payload: ResourceClientResponse<
          ResourceCollectionMap,
          keyof ResourceCollectionMap
        >;
      }
    | {
        event: 'removeResource';
        subscribers: SessionResource['subscribers'];
        payload: {
          item: undefined;
          type: ResourceResponse<
            ResourceCollectionMap,
            keyof ResourceCollectionMap
          >['type'];
        }; // TBD
      };
};

export class ServerSDK<
  ClientInfo extends UnknownRecord = {},
  ResourceCollectionMap extends Record<
    string,
    UnknownIdentifiableRecord
  > = Record<string, AnyIdentifiableRecord>,
  SessionCollectionMap extends SessionStoreCollectionMap<ResourceCollectionMap> = SessionStoreCollectionMap<ResourceCollectionMap>,
  SessionCollectionMapOfResourceKeys extends OnlySessionCollectionMapOfResourceKeys<ResourceCollectionMap> = OnlySessionCollectionMapOfResourceKeys<ResourceCollectionMap>
> {
  public socket?: Socket;

  private pubsy = new Pubsy<PubsyEvents<ResourceCollectionMap>>();

  private logger: typeof console;

  constructor(private config: ServerSDKConfig) {
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
        // this.handleIncomingMessage(socket);
        resolve(socket);

        this.logger.info('[ServerSdk] Connected Succesfully');
      });
    });
  }

  // This is taken out for now, until further notice!
  // private handleIncomingMessage(socket: Socket) {
  //   // socket.onAny((res) => {
  //   //   console.log('[serverdk]on any', res);
  //   // });

  //   // console.log('[serverdk] ServerSdkIO.msgNames.updateResource', ServerSdkIO.msgNames.updateResource);

  //   // socket.on(ServerSdkIO.msgNames.updateResource, () => {

  //   //   (res: WsResponseResultPayload<any, unknown>) => {
  //   //     console.log('got update msg', res);
  //   //     if (res.ok) {
  //   //       // this.pubsy.publish('onBroadcastToSubscribers', {
  //   //       //   event: 'updateResource',
  //   //       //   subscribers: res.val.subscribers,
  //   //       //   payload: res.val,
  //   //       // });
  //   //     }
  //   //   };
  //   // });
  //   objectKeys(ServerSdkIO.msgs).forEach((key) => {
  //     socket.on(
  //       ServerSdkIO.msgs[key].res,
  //       (res: WsResponseResultPayload<any, unknown>) => {
  //         if (res.ok) {
  //           this.pubsy.publish(key, res.val);
  //         }
  //       }
  //     );
  //   });
  // }

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
  }

  getClient(id: SessionClient['id']) {
    return this.emitAndAcknowledgeClients('getClient', { id });
  }

  removeClient(id: SessionClient['id']) {
    return this.emitAndAcknowledgeClients('removeClient', { id });
  }

  // getClients = this.sessionStore.getAllClients.bind(this.sessionStore);

  // getAllClients = this.sessionStore.getAllClients.bind(this.sessionStore);

  // updateClient = this.sessionStore.updateClient.bind(this.sessionStore);

  // // Resource

  createResource<
    TResourceType extends SessionCollectionMapOfResourceKeys,
    TResourceData extends UnidentifiableModel<
      SessionCollectionMap[TResourceType]
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
  }

  createResourceAndSubscribe<
    TResourceType extends SessionCollectionMapOfResourceKeys,
    TResourceData extends UnidentifiableModel<
      SessionCollectionMap[TResourceType]
    >
  >(
    clientId: SessionClient['id'],
    req: {
      resourceType: TResourceType;
      resourceData: TResourceData;
      resourceId?: SessionResource['id'];
    }
  ) {
    // TODO: This should actuall happen on the seshy server in order to diminish
    //  the trps back and forth!
    // And there ideally they happen all at once in redis! again to diminish the trips!
    return this.createResource(req)
      .flatMap((r) =>
        this.subscribeToResource(clientId, {
          resourceId: r.item.id,
          resourceType: req.resourceType,
        })
      )
      .map((r) => r.resource);
  }

  updateResource<
    TResourceType extends SessionCollectionMapOfResourceKeys,
    TResourceData extends SessionCollectionMap[TResourceType]
  >(
    resourceIdentifier: ResourceIdentifier<TResourceType>,
    resourceData: Partial<UnidentifiableModel<TResourceData>>
  ) {
    return this.emitAndAcknowledgeResources('updateResource', {
      resourceIdentifier,
      resourceData,
    }).map(
      AsyncResult.passThrough((nextResource) => {
        this.pubsy.publish('onBroadcastToSubscribers', {
          event: 'updateResource',
          subscribers: nextResource.subscribers,
          payload: {
            item: nextResource.item,
            type: nextResource.type,
          },
        });
      })
    );
  }

  removeResource<TResourceType extends SessionCollectionMapOfResourceKeys>(
    resourceIdentifier: ResourceIdentifier<TResourceType>
  ) {
    return this.emitAndAcknowledgeResources('removeResource', {
      resourceIdentifier,
    });
  }

  getResource<TResourceType extends SessionCollectionMapOfResourceKeys>(
    resourceIdentifier: ResourceIdentifier<TResourceType>
  ) {
    return this.emitAndAcknowledgeResources('getResource', {
      resourceIdentifier,
    });
  }

  observeResource<TResourceType extends SessionCollectionMapOfResourceKeys>(
    clientId: SessionClient['id'],
    resourceIdentifier: ResourceIdentifier<TResourceType>
  ) {
    return this.subscribeToResource(clientId, resourceIdentifier).map(
      (r) => r.resource
    );
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
  }

  // onResourceUpdated<TResourceType extends SessionCollectionMapOfResourceKeys>(
  //   fn: (r: ResourceResponse<ResourceCollectionMap, TResourceType>) => void
  // ) {
  //   this.pubsy.subscribe('updateResource');
  // }

  onBroadcastToSubscribers(
    fn: (
      r: PubsyEvents<ResourceCollectionMap>['onBroadcastToSubscribers']
    ) => void
  ) {
    return this.pubsy.subscribe('onBroadcastToSubscribers', fn);
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
    const reqId = `${k}:${String(Math.random()).slice(-3)}`;

    this.logger.info('[ServerSdk]', reqId, 'Request:', req.id);

    return AsyncResult.toAsyncResult<TRes, unknown>(
      new Promise((resolve, reject) => {
        this.socket?.emit(
          ServerSdkIO.msgs[k].req,
          req,
          withTimeout(
            (res: WsResponseResultPayload<TRes, unknown>) => {
              if (res.ok) {
                this.logger.info('[ServerSdk]', reqId, 'Response Ok');
                resolve(new Ok(res.val));
              } else {
                this.logger.warn('[ServerSdk]', reqId, 'Response Err:', res);
                reject(new Err(res.val));
              }
            },
            () => {
              this.logger.warn('[ServerSdk]', reqId, 'Request Timeout:', req);
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
    TRes = ResourceResponse<ResourceCollectionMap, TResourceType>
  >(
    k: K,
    req: TReq
  ): AsyncResult<TRes, unknown> => {
    const reqId = `${k}:${String(Math.random()).slice(-5)}`;

    if (req.resourceIdentifier.resourceId) {
      this.logger.info(
        '[ServerSdk]',
        reqId,
        'Request:',
        toResourceIdentifierString({
          resourceId: req.resourceIdentifier.resourceId,
          resourceType: req.resourceIdentifier.resourceType,
        })
      );
    } else {
      this.logger.info(
        '[ServerSdk]',
        reqId,
        'Request:',
        req.resourceIdentifier
      );
    }

    return AsyncResult.toAsyncResult<TRes, unknown>(
      new Promise((resolve, reject) => {
        this.socket?.emit(
          ServerSdkIO.msgs[k].req,
          req,
          withTimeout(
            (res: WsResponseResultPayload<TRes, unknown>) => {
              if (res.ok) {
                this.logger.info(
                  '[ServerSdk]',
                  reqId,
                  ' Response Ok'
                  // res.val
                );
                resolve(new Ok(res.val));
              } else {
                this.logger.warn(
                  '[ServerSdk]',
                  reqId,
                  ' Response Err:',
                  res.val
                );
                reject(new Err(res.val));
              }
            },
            () => {
              this.logger.warn('[ServerSdk]', reqId, ' Request Timeout:', req);
              reject(new Err('RequestTimeout')); // TODO This error could be typed better using a result error
            },
            this.config.waitForResponseMs
          )
        );
      })
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
      resource: ResourceResponse<ResourceCollectionMap, TResourceType>;
      client: SessionCollectionMap['$clients'];
    }
  >(
    k: K,
    req: Omit<TReq, 'resourceType'>
  ): AsyncResult<TRes, unknown> => {
    const reqId = `${k}:${String(Math.random()).slice(-5)}`;

    this.logger.info(
      '[ServerSdk]',
      reqId,
      'Request:',
      req.clientId,
      toResourceIdentifierString(req.resourceIdentifier)
    );

    return AsyncResult.toAsyncResult<TRes, unknown>(
      new Promise((resolve, reject) => {
        this.socket?.emit(
          ServerSdkIO.msgs[k].req,
          req,
          withTimeout(
            (res: WsResponseResultPayload<TRes, unknown>) => {
              if (res.ok) {
                // this.logger.info('[ServerSdk]', reqId, 'Response Ok:', res);
                this.logger.info('[ServerSdk]', reqId, 'Response Ok');
                resolve(new Ok(res.val));
              } else {
                this.logger.warn('[ServerSdk]', reqId, 'Response Err:', res);
                reject(new Err(res.val));
              }
            },
            () => {
              this.logger.warn('[ServerSdk]', reqId, 'Request Timeout:', req);
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
