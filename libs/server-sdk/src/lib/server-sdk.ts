import io from 'socket.io-client';
import { Socket } from 'socket.io-client';
import { Pubsy } from 'ts-pubsy';
import {
  AnyIdentifiableRecord,
  OnlySessionCollectionMapOfResourceKeys,
  ResourceIdentifier,
  ServerResource,
  SessionClient,
  SessionMatch,
  SessionStoreCollectionMap,
  UnidentifiableModel,
  UnknownIdentifiableRecord,
  UnknownRecord,
  WsResponseResultPayload,
  $MATCHES_KEY,
  CreateMatchReq,
  GenericResource,
} from '@matterio/core-util';
import { AsyncResult } from 'ts-async-results';
import { Err, Ok } from 'ts-results';
import { ServerSdkIO } from './server-sdk-io';

export type ServerSDKConfig = {
  url: string;
  apiKey: string;
  logger?: typeof console;
  waitForResponseMs?: number;
};

type PubsyEvents = Pick<
  ServerSdkIO.MsgToResponseMap,
  'updateResource' | 'removeResource'
>;

export class ServerSDK<
  ClientInfo extends UnknownRecord = {},
  GameState extends UnknownRecord = {},
  ResourceCollectionMap extends Record<
    string,
    UnknownIdentifiableRecord
  > = Record<string, AnyIdentifiableRecord>,
  SessionCollectionMap extends SessionStoreCollectionMap<ResourceCollectionMap> = SessionStoreCollectionMap<ResourceCollectionMap>,
  SessionCollectionMapOfResourceKeys extends OnlySessionCollectionMapOfResourceKeys<ResourceCollectionMap> = OnlySessionCollectionMapOfResourceKeys<ResourceCollectionMap>
> {
  public socket?: Socket;

  private pubsy = new Pubsy<PubsyEvents>();

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
  ) =>
    this.emitAndAcknowledge(ServerSdkIO.msgs[k].req, req).map((s) => s as TRes);

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
      resourceId?: GenericResource['id'];
    }
  ) {
    // TODO: This should actually happen on the seshy server in order to diminish
    //  the trps back and forth!
    // And there ideally they happen all at once in redis! again to diminish the trips!
    return this.createResource(req)
      .flatMap((r) =>
        this.subscribeToResource(clientId, {
          resourceId: r.item.id,
          resourceType: r.type,
        })
      )
      .map((r) => r.resource);
  }

  /**
   * Updates resurce silently
   *
   * @param resourceIdentifier
   * @param resourceData
   * @returns
   */
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
      AsyncResult.passThrough((r) => {
        this.pubsy.publish('updateResource', r);
      })
    );
  }

  // /**
  //  * Updates and broadcasts to all the resource subscribers
  //  *
  //  * @param resourceIdentifier
  //  * @param resourceData
  //  * @returns
  //  */
  // updateResourceAndBroadcast<
  //   TResourceType extends SessionCollectionMapOfResourceKeys,
  //   TResourceData extends SessionCollectionMap[TResourceType]
  // >(
  //   resourceIdentifier: ResourceIdentifier<TResourceType>,
  //   resourceData: Partial<UnidentifiableModel<TResourceData>>
  // ) {
  //   return this.updateResource(resourceIdentifier, resourceData).map(
  //     AsyncResult.passThrough((nextResource) => {
  //       // this.pubsy.publish()
  //       // this.pubsy.publish('onBroadcastToSubscribers', {
  //       //   event: 'updateResource',
  //       //   subscribers: nextResource.subscribers,
  //       //   payload: {
  //       //     item: nextResource.item,
  //       //     type: nextResource.type,
  //       //   },
  //       // });
  //     })
  //   );
  // }

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

  // observeResource<TResourceType extends SessionCollectionMapOfResourceKeys>(
  //   clientId: SessionClient['id'],
  //   resourceIdentifier: ResourceIdentifier<TResourceType>
  // ) {
  //   return this.subscribeToResource(clientId, resourceIdentifier).map(
  //     (r) => r.resource
  //   );
  // }

  private emitAndAcknowledgeResources = <
    K extends keyof Pick<
      typeof ServerSdkIO.msgs,
      'createResource' | 'getResource' | 'removeResource' | 'updateResource'
    >,
    TResourceType extends SessionCollectionMapOfResourceKeys,
    TReq extends ServerSdkIO.Payloads[K]['req'],
    TRes = ServerResource<ResourceCollectionMap, TResourceType>
  >(
    k: K,
    req: TReq
  ) =>
    this.emitAndAcknowledge(ServerSdkIO.msgs[k].req, req).map((s) => s as TRes);

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

  // onBroadcastToSubscribers(
  //   fn: (
  //     r: PubsyEvents<ResourceCollectionMap>['onBroadcastToSubscribers']
  //   ) => void
  // ) {
  //   return this.pubsy.subscribe('onBroadcastToSubscribers', fn);
  // }

  private emitAndAcknowledgeSubscriptions = <
    K extends keyof Pick<
      typeof ServerSdkIO.msgs,
      'subscribeToResource' | 'unsubscribeFromResource'
    >,
    TResourceType extends SessionCollectionMapOfResourceKeys,
    TReq extends ServerSdkIO.Payloads[K]['req'],
    TRes = {
      resource: ServerResource<ResourceCollectionMap, TResourceType>;
      client: SessionCollectionMap['$clients'];
    }
  >(
    k: K,
    req: Omit<TReq, 'resourceType'>
  ) =>
    this.emitAndAcknowledge(ServerSdkIO.msgs[k].req, req).map((s) => s as TRes);

  // Matches

  createMatch({
    matcher,
    playerCount,
    players = [],
    game,
  }: CreateMatchReq<GameState>) {
    const nextMatch: UnidentifiableModel<SessionMatch> = {
      status: 'waiting',
      playerCount,
      matcher,
      players: players.reduce(
        (accum, next) => ({ ...accum, [next]: true }),
        {} as SessionMatch['players']
      ),
      winner: undefined,
      game,
    };

    return this.createResource({
      resourceType: $MATCHES_KEY,
      resourceData: nextMatch as unknown as Parameters<
        typeof this.createResource
      >[0]['resourceData'],
    });
  }

  createMatchAndSubscribe(
    clientId: SessionClient['id'],
    props: CreateMatchReq<GameState>
  ) {
    // TODO: This should actually happen on the seshy server in order to diminish
    //  the trps back and forth!
    // And there ideally they happen all at once in redis! again to diminish the trips!
    return this.createMatch(props)
      .flatMap((r) =>
        this.subscribeToResource(clientId, {
          resourceId: r.item.id,
          resourceType: r.type,
        })
      )
      .map((r) => r.resource);
  }

  getMatch(matchId: SessionMatch['id']) {
    return this.getResource({
      resourceType: $MATCHES_KEY,
      resourceId: matchId,
    });
  }

  subscribeToMatch(clientId: SessionClient['id'], matchId: SessionMatch['id']) {
    return this.subscribeToResource(clientId, {
      resourceType: $MATCHES_KEY,
      resourceId: matchId,
    });
  }

  joinMatch(clientId: SessionClient['id'], matchId: SessionMatch['id']) {
    // TODO: This should be done on the SessionStore level, to reduce the double trip
    //  Can be done with by sending a type of update: APPEND | MERGE | REPLACE
    //  Look more into what the best pracitices around this are! How many type of updates are there?
    return this.getMatch(matchId).flatMap(({ item }) => {
      const prev = item as unknown as SessionMatch;
      const nextMatchPlayers: SessionMatch['players'] = {
        ...prev.players,
        // Here I'm not sure it should be the client id or the SessionId or even UserId
        [clientId]: true,
      };

      return this.updateResource(
        {
          resourceId: matchId,
          resourceType: $MATCHES_KEY,
        },
        {
          players: nextMatchPlayers,
        } as Partial<SessionCollectionMap['$matches']>
      );
    });
  }

  leaveMatch(clientId: SessionClient['id'], matchId: SessionMatch['id']) {
    // TODO: This should be done on the SessionStore level, to reduce the double trip
    //  Can be done with by sending a type of update: APPEND | MERGE | REPLACE
    //  Look more into what the best pracitices around this are! How many type of updates are there?
    return this.getMatch(matchId).flatMap(({ item }) => {
      const prev = item as unknown as SessionMatch;
      const { [clientId]: _, ...nextMatchPlayers } = prev.players;

      return this.updateResource(
        {
          resourceId: matchId,
          resourceType: $MATCHES_KEY,
        },
        {
          players: nextMatchPlayers,
        } as unknown as Partial<SessionCollectionMap['$matches']>
      );
    });
  }

  private emitAndAcknowledge = <TEvent extends string, TReq>(
    event: TEvent,
    requestPayload: TReq
  ): AsyncResult<unknown, unknown> =>
    AsyncResult.toAsyncResult<unknown, unknown>(
      new Promise((resolve, reject) => {
        const reqId = `${event}(${String(Math.random()).slice(-3)})`;
        this.logger.info('[ServerSdk]', event, 'Request');

        this.socket?.emit(
          event,
          requestPayload,
          withTimeout(
            (res: WsResponseResultPayload<unknown, unknown>) => {
              if (res.ok) {
                this.logger.info('[ServerSdk]', reqId, 'Response Ok');
                resolve(new Ok(res.val));
              } else {
                this.logger.warn('[ServerSdk]', reqId, 'Response Err', res);
                reject(new Err(res.val));
              }
            },
            () => {
              this.logger.warn(
                '[ServerSdk]',
                reqId,
                'Response Err:',
                'Request Timeout'
              );
              reject(new Err('RequestTimeout')); // TODO This error could be typed better using a result error
            },
            this.config.waitForResponseMs
          )
        );
      }).catch((e) => e) as any
    );
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
