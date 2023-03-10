import { Socket } from 'socket.io-client';
import * as ClientSdkIO from './client-io';
import {
  $MATCHES_KEY,
  AnyIdentifiableRecord,
  CreateMatchReq,
  OnlySessionCollectionMapOfResourceKeys,
  ResourceIdentifier,
  SessionMatch,
  SessionStoreCollectionMap,
  UnidentifiableModel,
  UnknownIdentifiableRecord,
  UnknownRecord,
  WsResponseResultPayload,
  GenericResource,
  toResourceIdentifierObj,
  ClientResource,
  toResourceIdentifierStr,
  ClientResourceShape,
} from 'movex-core-util';
import { Pubsy } from 'ts-pubsy';
import { AsyncResult } from 'ts-async-results';
import { Err, Ok } from 'ts-results';
import { PromiseDelegate } from 'promise-delegate';
import { ActionsCollectionMapBase, AnyAction } from './tools/action';
import { MovexReducer } from './tools/reducer';
import { MovexResource } from './MovexResource';

type RequestsCollectionMapBase = Record<string, [unknown, unknown]>;

export type MovexClientConfig = {
  url: string;
  clientId?: string; // Pass in a userId or allow the SDK to generate a random one
  apiKey: string;
  logger?: typeof console;
  waitForResponseMs?: number;
};

export class MovexClient<
  ClientInfo extends UnknownRecord = {},
  GameState extends UnknownRecord = {},
  ActionsCollectionMap extends ActionsCollectionMapBase = {},
  ResourceCollectionMap extends Record<
    string,
    UnknownIdentifiableRecord
  > = Record<string, AnyIdentifiableRecord>,
  RequestsCollectionMap extends RequestsCollectionMapBase = Record<
    string,
    [any, any]
  >,
  SessionCollectionMap extends SessionStoreCollectionMap<ResourceCollectionMap> = SessionStoreCollectionMap<ResourceCollectionMap>,
  SessionCollectionMapOfResourceKeys extends OnlySessionCollectionMapOfResourceKeys<ResourceCollectionMap> = OnlySessionCollectionMapOfResourceKeys<ResourceCollectionMap>
> {
  // private socketInstance: Socket;

  private socketConnectionDelegate = new PromiseDelegate<Socket>(true);

  private pubsy = new Pubsy<
    Pick<ClientSdkIO.MsgToResponseMap, 'updateResource' | 'removeResource'> & {
      _socketConnect: { clientId: string };
      _socketDisconnect: undefined;

      // Broadcasts
      // TODO: This MUST be typed
      clientBroadcastedMsg: {
        event: string;
        msg: unknown;
      };
    }
  >();

  private logger: typeof console;

  constructor(
    private socketInstance: Socket,
    private config: MovexClientConfig
  ) {
    this.logger = config.logger || console;
    this.config.waitForResponseMs = this.config.waitForResponseMs || 15 * 1000;

    let unsubscribeOnSocketDisconnnect: Function[] = [];

    this.socketInstance.on('connect', () => {
      unsubscribeOnSocketDisconnnect = [
        ...this.handleConnection(this.socketInstance),
        ...this.handleIncomingMessage(this.socketInstance),
      ];
    });

    this.socketInstance.on('disconnect', () => {
      this.pubsy.publish('_socketDisconnect', undefined);

      // TODO: add delegate
      this.socketConnectionDelegate = new PromiseDelegate<Socket>(true);

      // TODO: Test that the unsubscribptions work correctly
      unsubscribeOnSocketDisconnnect.forEach((unsubscribe) => unsubscribe());
    });
  }

  private handleConnection(socket: Socket) {
    const unsubscribers: Function[] = [];
    // TODO: Type this with zod
    const $clientConnectHandler = (payload: { clientId: string }) => {
      this.logger.info('[MovexClient] Connected Succesfully', payload);

      // Resolve the socket promise now!
      this.socketConnectionDelegate.resolve(this.socketInstance);

      this.pubsy.publish('_socketConnect', payload);
    };

    // TODO: Type the EventName
    socket.on('$clientConnected', $clientConnectHandler);
    unsubscribers.push(() =>
      socket.off('$clientConnected', $clientConnectHandler)
    );

    return unsubscribers;
  }

  private handleIncomingMessage(socket: Socket) {
    const unsubscribers: Function[] = [];

    // Resource

    const updateResourceHandler = (
      res: WsResponseResultPayload<
        ClientSdkIO.MsgToResponseMap['updateResource'],
        unknown
      >
    ) => {
      if (res.ok) {
        this.pubsy.publish('updateResource', res.val);
      }
    };

    socket.on(ClientSdkIO.msgNames.updateResource, updateResourceHandler);

    unsubscribers.push(() =>
      socket.off(ClientSdkIO.msgNames.updateResource, updateResourceHandler)
    );

    // BroadcastedEvents
    // TODO: Reuse this from one place only since it's written in the backend as well
    const BROADCAST_PREFIX = 'broadcast::';
    const onBroadcastsHandler = (event: string, msg: unknown) => {
      if (event.slice(0, BROADCAST_PREFIX.length) !== BROADCAST_PREFIX) {
        // Only handle broadcast messages
        return;
      }

      console.log(
        '[client sdk] broadcasting',
        event.slice(BROADCAST_PREFIX.length)
      );

      this.pubsy.publish('clientBroadcastedMsg', {
        event: event.slice(BROADCAST_PREFIX.length), // Remove the prefix
        msg,
      });
    };

    socket.onAny(onBroadcastsHandler);

    unsubscribers.push(() => {
      socket.offAny(onBroadcastsHandler);
    });

    return unsubscribers;

    // Handle Remove resource

    // [ClientSdkIO.msgNames.updateResource, ClientSdkIO.msgNames.removeResource].forEach(
    //   (key) => {
    //     socket.on(
    //       ClientSdkIO.msgs[key].res,
    //       // (res: WsResponseResultPayload<any, unknown>) => {
    //       (res) => {
    //         // console.log('[client sdk] going to publish', key, res);
    //         if (res.ok) {
    //           this.pubsy.publish(key, res.val);
    //         }
    //       }
    //     );
    //   }
    // );
  }

  get socketConnection() {
    return this.socketConnectionDelegate.promise;
  }

  connect() {
    return this.socketInstance.connect();
  }

  disconnect() {
    this.socketInstance.close();
  }

  onConnect(fn: (p: { clientId: string }) => void) {
    // TODO: This gets called only when the server returned ta specific Client Identifiction message

    return this.pubsy.subscribe('_socketConnect', fn);
  }

  onDisconnect(fn: () => void) {
    return this.pubsy.subscribe('_socketDisconnect', fn);
  }

  createResource<
    TResourceType extends SessionCollectionMapOfResourceKeys,
    TResourceData extends UnidentifiableModel<
      SessionCollectionMap[TResourceType]
    >
  >(req: {
    resourceType: TResourceType;
    resourceData: TResourceData;
    resourceId?: GenericResource['id'];
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
    TResourceData extends ResourceCollectionMap[TResourceType]
  >(
    resourceIdentifier: ResourceIdentifier<TResourceType>,
    resourceData: Partial<UnidentifiableModel<TResourceData>>
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

  observeResource<TResourceType extends SessionCollectionMapOfResourceKeys>(
    resourceIdentifier: ResourceIdentifier<TResourceType>
    // subsriberFn?: (
    //   r: ClientResource<TResourceType, ResourceCollectionMap[TResourceType]>
    // ) => void
  ) {
    // if (subsriberFn) {
    //   this.pubsy.subscribe()
    // }

    return this.emitAndAcknowledgeResources('observeResource', {
      resourceIdentifier,
    });
  }

  subscribeToResource<TResourceType extends SessionCollectionMapOfResourceKeys>(
    resourceIdentifier: ResourceIdentifier<TResourceType>,
    subsriberFn: (
      r: ClientResource<ResourceCollectionMap, TResourceType>
    ) => void
  ) {
    const { resourceId, resourceType } =
      toResourceIdentifierObj(resourceIdentifier);

    const unsubscriber = this.pubsy.subscribe('updateResource', (r) => {
      console.log(
        '[client-sdk] subscriber for',
        toResourceIdentifierStr(resourceIdentifier),
        ' received onUpdateResource',
        r
      );
      // Only be called for the given resource!
      if (r.type === resourceType && r.item.id === resourceId) {
        subsriberFn(
          r as unknown as ClientResource<ResourceCollectionMap, TResourceType>
        );
      }
    });

    this.emitAndAcknowledgeSubscriptions('subscribeToResource', {
      resourceIdentifier,
    }).mapErr(() => {
      // I believe this be called if an error occured!
      unsubscriber();
    });

    return unsubscriber;
  }

  unsubscribeFromResource<
    TResourceType extends SessionCollectionMapOfResourceKeys
  >(resourceIdentifier: ResourceIdentifier<TResourceType>) {
    return this.emitAndAcknowledgeSubscriptions('unsubscribeFromResource', {
      resourceIdentifier,
    });
  }

  private emitAndAcknowledgeSubscriptions = <
    K extends keyof Pick<
      typeof ClientSdkIO.msgs,
      'subscribeToResource' | 'unsubscribeFromResource'
    >,
    TReq extends ClientSdkIO.Payloads[K]['req'],
    TRes = void
  >(
    k: K,
    req: Omit<TReq, 'resourceType'>
  ) => this.emitAndAcknowledge(k, req).map((s) => s as TRes);

  onResourceUpdated<TResourceType extends SessionCollectionMapOfResourceKeys>(
    fn: (r: ClientResource<ResourceCollectionMap, TResourceType>) => void
  ) {
    return this.pubsy.subscribe('updateResource', (r) => {
      fn(r as unknown as ClientResource<ResourceCollectionMap, TResourceType>);
    });
  }

  onBroadcastedMsg<TEvent extends string, TMsg extends unknown>(
    fn: (data: { event: TEvent; msg: TMsg }) => void
  ) {
    return this.pubsy.subscribe('clientBroadcastedMsg', ({ event, msg }) => {
      fn({
        event: event as TEvent,
        msg: msg as TMsg,
      });
    });
  }

  // TBD
  // onResourceRemoved<TResourceType extends SessionCollectionMapOfResourceKeys>(}

  // onResourceUpdated<TResourceType extends SessionCollectionMapOfResourceKeys>(
  //   resourceType: TResourceType,
  //   fn: (r: ResourceCollectionMap[TResourceType]) => void
  // ) {
  //   //TBD
  // }

  request<
    TReqType extends keyof RequestsCollectionMap,
    TReq = RequestsCollectionMap[TReqType]['0'],
    TRes = RequestsCollectionMap[TReqType]['1']
  >(k: TReqType, req: TReq): AsyncResult<TRes, unknown> {
    const reqName = String(k);
    const reqId = `${reqName}:${String(Math.random()).slice(-5)}`;

    return AsyncResult.toAsyncResult<TRes, unknown>(
      new Promise(async (resolve, reject) => {
        const connection = await this.socketConnection;

        this.logger.info('[MovexClient]', reqId, 'Request:', reqName);

        connection.emit(
          'request',
          [reqName, req],
          withTimeout(
            (res: WsResponseResultPayload<TRes, unknown>) => {
              if (res.ok) {
                this.logger.info(
                  '[MovexClient]',
                  reqId,
                  ' Response Ok:',
                  res.val
                );
                resolve(new Ok(res.val));
              } else {
                this.logger.warn(
                  '[MovexClient]',
                  reqId,
                  ' Response Err:',
                  res.val
                );
                reject(new Err(res.val));
              }
            },
            () => {
              this.logger.warn(
                '[MovexClient]',
                reqId,
                ' Request Timeout:',
                req
              );
              reject(new Err('RequestTimeout')); // TODO This error could be typed better using a result error
            },
            this.config.waitForResponseMs
          )
        );
      })
    );
  }

  private emitAndAcknowledgeResources = <
    K extends keyof Pick<
      typeof ClientSdkIO.msgs,
      | 'createResource'
      | 'observeResource'
      | 'getResource'
      | 'removeResource'
      | 'updateResource'
    >,
    TResourceType extends SessionCollectionMapOfResourceKeys,
    TReq extends ClientSdkIO.Payloads[K]['req'],
    TRes extends ClientResourceShape<
      TResourceType,
      ResourceCollectionMap[TResourceType]
    > = ClientResourceShape<TResourceType, ResourceCollectionMap[TResourceType]>
  >(
    k: K,
    req: TReq
  ) => this.emitAndAcknowledge(k, req).map((s) => s as TRes);
  // .map((s) => s.item as TRes);

  // Matches
  createMatch(req: CreateMatchReq<GameState>) {
    return this.emitAndAcknowledgeMatches('createMatch', req);
  }

  getMatch(matchId: SessionMatch['id']) {
    return this.emitAndAcknowledgeMatches('getMatch', { matchId });
  }

  // observeMatch(matchId: SessionMatch['id'], subscribeFn?: () => {}) {
  //   if (subscribeFn) {

  //   }

  //   return this.emitAndAcknowledgeMatches('observeMatch', { matchId });
  // }

  subscribeToMatch(
    matchId: SessionMatch['id'],
    subsriberFn: (r: SessionMatch) => void
  ) {
    return this.subscribeToResource(
      {
        resourceType: $MATCHES_KEY,
        resourceId: matchId,
      },
      (r) => subsriberFn(r.item as unknown as SessionMatch)
    );
  }

  joinMatch(matchId: SessionMatch['id']) {
    return this.emitAndAcknowledgeMatches('joinMatch', { matchId });
  }

  leaveMatch(matchId: SessionMatch['id']) {
    return this.emitAndAcknowledgeMatches('leaveMatch', { matchId });
  }

  private emitAndAcknowledgeMatches = <
    K extends keyof Pick<
      typeof ClientSdkIO.msgs,
      'createMatch' | 'joinMatch' | 'leaveMatch' | 'getMatch'
    >,
    TReq extends ClientSdkIO.Payloads[K]['req'],
    // TRawRes extends ResourceCollectionMap[TResourceType] = ResourceCollectionMap[TResourceType],
    // TRawRes extends {
    //   type: TResourceType;
    //   item: ResourceCollectionMap[TResourceType];
    //   subscribers: SessionCollectionMap[TResourceType]['subscribers'];
    // } = {
    //   type: TResourceType;
    //   item: ResourceCollectionMap[TResourceType];
    //   subscribers: SessionCollectionMap[TResourceType]['subscribers'];
    // },
    TRes = SessionMatch<GameState> // TODO: This should prob be better typed
  >(
    k: K,
    req: TReq
  ) => this.emitAndAcknowledge(k, req).map((s) => s as TRes);

  private emitAndAcknowledge = <TEvent extends string, TReq>(
    event: TEvent,
    req: TReq
  ): AsyncResult<unknown, unknown> =>
    AsyncResult.toAsyncResult<unknown, unknown>(
      new Promise(async (resolve, reject) => {
        const reqId = `${event}(${String(Math.random()).slice(-3)})`;
        const connection = await this.socketConnection;

        this.logger.info('[MovexClient]', reqId, 'Request:', req);

        connection.emit(
          event,
          req,
          withTimeout(
            (res: WsResponseResultPayload<unknown, unknown>) => {
              if (res.ok) {
                this.logger.info('[MovexClient]', reqId, 'Response Ok:', res);
                resolve(new Ok(res.val));
              } else {
                this.logger.warn('[MovexClient]', reqId, 'Response Err:', res);
                reject(new Err(res.val));
              }
            },
            () => {
              this.logger.warn('[MovexClient]', reqId, 'Request Timeout:', req);
              // TODO This error could be typed better using a result error
              reject(new Err('RequestTimeout'));
            },
            this.config.waitForResponseMs
          )
        );
      }).catch((e) => e) as any
    );

  registerResource<S, A extends AnyAction>(
    type: string,
    reducer: MovexReducer<S, A>
  ) {
    return new MovexResource(reducer);
  }

  // Resource Updates via Actions
  // registerResourceReducer<
  //   TResourceType extends SessionCollectionMapOfResourceKeys,
  //   TResource extends ResourceShape<
  //     TResourceType,
  //     SessionCollectionMap[TResourceType]
  //   > = ResourceShape<TResourceType, SessionCollectionMap[TResourceType]>
  // >(
  //   rId: ResourceIdentifier<TResourceType>,
  //   reducersMap: ResourceReducerMap<TResource, ActionsCollectionMap>,
  //   onUpdate?: (state: TResource['item']) => void
  // ) {
  //   // this.observeResource(rId)
  //   // Get the resource and subscribe to it
  //   // let prebatchedActions: GenericAction[] = [];

  //   // let remoteDispatch: <TActionType extends keyof ActionsCollectionMap>(
  //   //   type: TActionType,
  //   //   payload: ActionsCollectionMap[TActionType]
  //   // ) => void;
  //   let cachedState: TResource['item'];

  //   // TODO: Ideally we have on getAndSubscribe call only
  //   // this.getResource(rId).map((res) => {
  //   //   cachedState = res as unknown as TResource['item'];
  //   //   // remoteDispatch = registerResourceReducer(res as , actionsHandler, onUpdate);
  //   // });

  //   // // TODO: VERY IMPORTANT: when the states aren't the same when it comes from the server,
  //   // //
  //   // this.subscribeToResource(rId, (r) => {
  //   //   // TODO: Why is this different from get?
  //   //   cachedState = r.item as unknown as TResource['item'];
  //   // });

  //   return dispatchFactory<TResource, ActionsCollectionMap>(
  //     this.getResource(rId).resolve() as unknown as Promise<TResource>,
  //     reducersMap,
  //     (next) => {
  //       // TODO: Add the remote sync and logic for when it's not the same!
  //       // Here I need to create request the action and wait for the ack
  //       //   If they are the same, all good
  //       //   Otherwise there needs to be a solution.
  //       //   Also, when an update comes (which couldb)

  //       // this.

  //       onUpdate?.(next);
  //     }
  //   );

  // const dispatch = <TActionType extends keyof ActionsCollectionMap>(
  //   type: TActionType,
  //   payload: ActionsCollectionMap[TActionType]

  //   // Here - it needs to handle the private action one as well
  //   // NEXT - Implement this on the backend and check public/private
  //   // Next Next - implement in on maha and change the whole game strategy to this
  // ) => {
  //   if (!cachedState) {
  //     prebatchedActions.push({
  //       type,
  //       payload,
  //     });

  //     return;
  //   }

  //   if (prebatchedActions.length > 0) {
  //     prebatchedActions = [];
  //   }

  //   const handlerFn = actionsHandler[type];
  //   if (!handlerFn) {
  //     return;
  //   }

  //   // this is actually the next state
  //   cachedState = handlerFn(cachedState, { type, payload });
  //   onUpdate?.(cachedState);
  // };

  // return dispatch;
}

// // This dispatches public actions, that will automatically broadcast to all subscribers of the resource
// dispatchResourceAction<TActionType extends keyof ActionsCollectionMap>(
//   action: Action<TActionType, ActionsCollectionMap[TActionType]>
// ) {}

// // This dispatches private actions (update private state) and public actions (update public state and broadcast to all)
// dispatchResourcePrivateAction<
//   TPrivateActionType extends keyof ActionsCollectionMap,
//   TPublicActionType extends keyof ActionsCollectionMap
// >(
//   privateAction: Action<
//     TPrivateActionType,
//     ActionsCollectionMap[TPrivateActionType]
//   >,
//   publicAction?: Action<
//     TPrivateActionType,
//     ActionsCollectionMap[TPrivateActionType]
//   >
// ) {}
// }

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

const getDelayedRejectionPromise = <T>(delay = 15 * 1000, err = 'Timeout') =>
  new Promise<T>((_, reject) => {
    setTimeout(() => reject(err), delay); // wait for a long time to reconnect before failing
  });
