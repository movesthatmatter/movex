import io from 'socket.io-client';
import { Socket } from 'socket.io-client';
import { Pubsy } from 'ts-pubsy';
import { ServerSdkIO } from '../io';
import {
  AnySessionResourceCollectionMap,
  OnlySessionCollectionMapOfResourceKeys,
  ResourceIdentifier,
  SessionClient,
  SessionStoreCollectionMap,
  UnknownRecord,
  UnknwownSessionResourceCollectionMap,
  WsResponseResultPayload,
} from './types';
import { objectKeys, UnidentifiableModel } from 'relational-redis-store';
import { AsyncResult, AsyncResultWrapper } from 'ts-async-results';

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

  constructor(
    private config: {
      url: string;
      apiKey: string;
    }
  ) {}

  async connect() {
    this.socket = io(this.config.url, {
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

    return new Promise((resolve: (socket: Socket) => void) => {
      this.socket?.on('connect', () => {
        if (!this.socket) {
          return;
        }

        this.handleIncomingMessage(this.socket);
        resolve(this.socket);
      });
    });
  }

  private handleIncomingMessage(socket: Socket) {
    objectKeys(ServerSdkIO.msgs).forEach((key) => {
      socket.on(
        ServerSdkIO.msgs[key].res,
        (res: WsResponseResultPayload<any, unknown>) => {
          console.log(key, ServerSdkIO.msgs[key].res, 'res')
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
  createClient(p?: { id?: SessionClient['id']; info?: ClientInfo }) {
    this.socket?.emit(ServerSdkIO.msgs.createClient.req, p);

    // TODO: This must return a requestId, which will be used in the onResponse
  }

  // removeClient(id: SessionClient['id']) {
  //   this.socket?.emit('');
  // }

  // getClient = this.sessionStore.getClient.bind(this.sessionStore);

  // getClients = this.sessionStore.getAllClients.bind(this.sessionStore);

  // getAllClients = this.sessionStore.getAllClients.bind(this.sessionStore);

  // updateClient = this.sessionStore.updateClient.bind(this.sessionStore);

  // removeClient = this.sessionStore.removeClient.bind(this.sessionStore);

  // // Resource

  createResource<
    TResourceType extends SessionCollectionMapOfResourceKeys,
    TResourceData extends UnidentifiableModel<
      SessionCollectionMap[TResourceType]['data']
    >
  >(resourceType: TResourceType, resourceData: TResourceData) {
    this.socket?.emit(ServerSdkIO.msgs.createResource.req, {
      resourceType,
      resourceData,
    });
  }

  updateResource<
    TResourceType extends SessionCollectionMapOfResourceKeys,
    TResourceData extends UnidentifiableModel<
      SessionCollectionMap[TResourceType]['data']
    >
  >(
    resourceIdentifier: ResourceIdentifier<TResourceType>,
    data: Partial<TResourceData>
  ) {
    this.socket?.emit(ServerSdkIO.msgs.updateResource.req, {
      resourceIdentifier,
      data,
    });
  }

  removeResource<TResourceType extends SessionCollectionMapOfResourceKeys>(
    resourceIdentifier: ResourceIdentifier<TResourceType>
  ) {
    this.socket?.emit(ServerSdkIO.msgs.removeResource.req, {
      resourceIdentifier,
    });
  }

  getResource<TResourceType extends SessionCollectionMapOfResourceKeys>(
    resourceIdentifier: ResourceIdentifier<TResourceType>
  ): AsyncResult<ResourceCollectionMap[TResourceType], unknown> {
    // TODO: Rhe error should come from store as well?

    return new AsyncResultWrapper(
      new Promise((resolve) => {
        this.socket?.emit(
          ServerSdkIO.msgs.getResource.req,
          resourceIdentifier,
          resolve
        );
      })
    );
  }

  // getResource = this.sessionStore.getResource.bind(this.sessionStore);

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
    this.socket?.emit(ServerSdkIO.msgs.subscribeToResource.req, {
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
    this.socket?.emit(ServerSdkIO.msgs.unsubscribeFromResource.req, {
      clientId,
      resourceIdentifier,
    });
  }

  // private emit = <
  //   K extends keyof typeof ServerSdkIO.msgs,
  //   TPayload extends ServerSdkIO.Payloads[K]['req']
  // >(
  //   k: K,
  //   payload: TPayload
  // ) => {
  //   this.socket?.emit(ServerSdkIO.msgs[k].req, payload);
  // };
}
