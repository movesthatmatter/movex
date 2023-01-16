import io, { Socket } from 'socket.io-client';
import { SdkIO } from './io';
import {
  AnySessionResourceCollectionMap,
  OnlySessionCollectionMapOfResourceKeys,
  ResourceIdentifier,
  SessionClient,
  SessionResource,
  SessionStoreCollectionMap,
  UnidentifiableModel,
  UnknownRecord,
  UnknwownSessionResourceCollectionMap,
  WsResponseResultPayload,
} from './types';
import { objectKeys } from './util';
import { Pubsy } from 'ts-pubsy';
import { AsyncResult } from 'ts-async-results';
import { Err, Ok } from 'ts-results';

type Events = SdkIO.MsgToResponseMap;

type RequestsCollectionMapBase = Record<string, [unknown, unknown]>;

export class ClientSdk<
  ClientInfo extends UnknownRecord = {},
  ResourceCollectionMap extends UnknwownSessionResourceCollectionMap = AnySessionResourceCollectionMap,
  RequestsCollectionMap extends RequestsCollectionMapBase = Record<
    string,
    [any, any]
  >,
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

        this.logger.info('[ClientSdk] Connected Succesfully');
      });
    });
  }

  private handleIncomingMessage(socket: Socket) {
    objectKeys(SdkIO.msgs).forEach((key) => {
      socket.on(
        SdkIO.msgs[key].res,
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

  // TODO: These I believe are more like connect in the realm of the client SDK
  createClient(req: { id?: SessionClient['id']; info?: ClientInfo } = {}) {
    return this.emitAndAcknowledgeClients('createClient', req);
  }

  getClient(id: SessionClient['id']) {
    return this.emitAndAcknowledgeClients('getClient', { id });
  }

  removeClient(id: SessionClient['id']) {
    return this.emitAndAcknowledgeClients('removeClient', { id });
  }

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

  onResourceUpdated<TResourceType extends SessionCollectionMapOfResourceKeys>(
    resourceType: TResourceType,
    fn: (r: ResourceCollectionMap[TResourceType]) => void
  ) {
    //TBD
  }

  request<
    TReqType extends keyof RequestsCollectionMap,
    TReq = RequestsCollectionMap[TReqType]['0'],
    TRes = RequestsCollectionMap[TReqType]['1']
  >(k: TReqType, req: TReq): AsyncResult<TRes, unknown> {
    const reqName = String(k);
    const reqId = `${reqName}:${String(Math.random()).slice(-5)}`;

    this.logger.info(reqId, '[ClientSdk] Request:', reqName);

    return AsyncResult.toAsyncResult<TRes, unknown>(
      new Promise((resolve, reject) => {
        this.socket?.emit(
          'request',
          [reqName, req],
          withTimeout(
            (res: WsResponseResultPayload<TRes, unknown>) => {
              if (res.ok) {
                this.logger.info(reqId, '[ClientSdk] Response Ok:', res.val);
                resolve(new Ok(res.val));
              } else {
                this.logger.warn(reqId, '[ClientSdk] Response Err:', res.val);
                reject(new Err(res.val));
              }
            },
            () => {
              this.logger.warn(reqId, '[ClientSdk] Request Timeout:', req);
              reject(new Err('RequestTimeout')); // TODO This error could be typed better using a result error
            },
            this.config.waitForResponseMs
          )
        );
      })
    );
  }

  // broadcast<
  //   TReqType extends keyof RequestsCollectionMap,
  //   TReq = RequestsCollectionMap[TReqType]['0'],
  // >(k: TReqType, req: TReq): AsyncResult<void, unknown> {

  // }

  private emitAndAcknowledgeClients = <
    K extends keyof Pick<
      typeof SdkIO.msgs,
      'createClient' | 'getClient' | 'removeClient'
    >,
    TReq extends SdkIO.Payloads[K]['req'],
    TRes = SessionCollectionMap['$clients']
  >(
    k: K,
    req: TReq
  ): AsyncResult<TRes, unknown> => {
    const reqId = `${k}:${String(Math.random()).slice(-5)}`;

    this.logger.info(reqId, '[ClientSdk] Request:', req);

    return AsyncResult.toAsyncResult<TRes, unknown>(
      new Promise((resolve, reject) => {
        this.socket?.emit(
          SdkIO.msgs[k].req,
          req,
          withTimeout(
            (res: WsResponseResultPayload<TRes, unknown>) => {
              if (res.ok) {
                this.logger.info(reqId, '[ClientSdk] Response Ok:', res);
                resolve(new Ok(res.val));
              } else {
                this.logger.warn(reqId, '[ClientSdk] Response Err:', res);
                reject(new Err(res.val));
              }
            },
            () => {
              this.logger.warn(reqId, '[ClientSdk] Request Timeout:', req);
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
      typeof SdkIO.msgs,
      'createResource' | 'getResource' | 'removeResource' | 'updateResource'
    >,
    TResourceType extends SessionCollectionMapOfResourceKeys,
    TReq extends SdkIO.Payloads[K]['req'],
    TRawRes extends ResourceCollectionMap[TResourceType] = ResourceCollectionMap[TResourceType],
    TRes = {
      id: ResourceCollectionMap[TResourceType]['id'];
    } & ResourceCollectionMap[TResourceType]['data']
  >(
    k: K,
    req: TReq
  ): AsyncResult<TRes, unknown> => {
    const reqId = `${k}:${String(Math.random()).slice(-5)}`;

    this.logger.info(reqId, '[ClientSdk] Request:', req);

    return AsyncResult.toAsyncResult<TRes, unknown>(
      new Promise((resolve, reject) => {
        this.socket?.emit(
          SdkIO.msgs[k].req,
          req,
          withTimeout(
            (res: WsResponseResultPayload<TRawRes, unknown>) => {
              if (res.ok) {
                this.logger.info(reqId, '[ClientSdk] Response Ok:', res.val);
                resolve(
                  new Ok(res.val).map(
                    (r: TRawRes) =>
                      ({
                        // TODO: This transformation should be done on the server I believe!!!
                        // As the clients shouldn't even see the other ubscribers and stuff like that!
                        id: r.id,
                        ...r.data,
                      } as TRes)
                  )
                );
              } else {
                this.logger.warn(reqId, '[ClientSdk] Response Err:', res.val);
                reject(new Err(res.val));
              }
            },
            () => {
              this.logger.warn(reqId, '[ClientSdk] Request Timeout:', req);
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
      typeof SdkIO.msgs,
      'subscribeToResource' | 'unsubscribeFromResource'
    >,
    TResourceType extends SessionCollectionMapOfResourceKeys,
    TReq extends SdkIO.Payloads[K]['req'],
    TRes = {
      resource: SessionCollectionMap[TResourceType];
      client: SessionCollectionMap['$clients'];
    }
  >(
    k: K,
    req: Omit<TReq, 'resourceType'>
  ): AsyncResult<TRes, unknown> => {
    const reqId = `${k}:${String(Math.random()).slice(-5)}`;

    this.logger.info(reqId, '[ClientSdk] Request:', req);

    return AsyncResult.toAsyncResult<TRes, unknown>(
      new Promise((resolve, reject) => {
        this.socket?.emit(
          SdkIO.msgs[k].req,
          req,
          withTimeout(
            (res: WsResponseResultPayload<TRes, unknown>) => {
              if (res.ok) {
                this.logger.info(reqId, '[ClientSdk] Response Ok:', res);
                resolve(new Ok(res.val));
              } else {
                this.logger.warn(reqId, '[ClientSdk] Response Err:', res);
                reject(new Err(res.val));
              }
            },
            () => {
              this.logger.warn(reqId, '[ClientSdk] Request Timeout:', req);
              // TODO This error could be typed better using a result error
              reject(new Err('RequestTimeout'));
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
