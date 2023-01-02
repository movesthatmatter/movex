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
import { UnidentifiableModel } from 'relational-redis-store';

// This is what creates the bridge between the seshy api server and the client's server
// via sockets

type Events = {
  createClient: SessionClient;

  createResource: SessionResource;
  updateResource: SessionResource;

  subscribeToResource: {
    client: SessionClient;
    resource: SessionResource;
  };
};

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
    // $clients
    socket.on(
      ServerSdkIO.responses.createClient,
      (clientResult: WsResponseResultPayload<SessionClient, unknown>) => {
        if (clientResult.ok) {
          this.pubsy.publish('createClient', clientResult.val);
        }
      }
    );

    // resources
    socket.on(
      ServerSdkIO.responses.createResource,
      (resourceResult: WsResponseResultPayload<SessionResource, unknown>) => {
        if (resourceResult.ok) {
          this.pubsy.publish('createResource', resourceResult.val);
        }
      }
    );

    socket.on(
      ServerSdkIO.responses.updateResource,
      (resourceResult: WsResponseResultPayload<SessionResource, unknown>) => {
        if (resourceResult.ok) {
          this.pubsy.publish('updateResource', resourceResult.val);
        }
      }
    );

    // subscriptions
    socket.on(
      ServerSdkIO.responses.subscribeToResource,
      (
        result: WsResponseResultPayload<
          {
            client: SessionClient;
            resource: SessionResource;
          },
          unknown
        >
      ) => {
        if (result.ok) {
          this.pubsy.publish('subscribeToResource', result.val);
        }
      }
    );
  }

  disconnect() {
    this.socket?.close();
  }

  on = this.pubsy.subscribe.bind(this.pubsy);

  // This are message that wait for a response
  // private emitAndWaitForResponse(topic: string, msg?: unknown) {
  //   this.socket?.emit(topic, msg);
  // }

  // Client

  // createClient = this.sessionStore.createClient.bind(this.sessionStore);

  // TODO: here add an inference or something to check if the p.info is defined in the
  //  generic, and if it is it becomes required, not optional!
  createClient(p?: { id?: SessionClient['id']; info?: ClientInfo }) {
    this.socket?.emit(ServerSdkIO.requests.createClient, p);

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
    this.socket?.emit(ServerSdkIO.requests.createResource, {
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
    this.socket?.emit(ServerSdkIO.requests.updateResource, {
      resourceIdentifier,
      data,
    });
  }

  // onResourceCreated(fn: (resource: SessionResource) => void) {
  //   return this.pubsy.subscribe('createResource', fn);
  // }

  // removeResource = this.sessionStore.removeResource.bind(this.sessionStore);

  // getResource = this.sessionStore.getResource.bind(this.sessionStore);

  // getResourceSubscribers = this.sessionStore.getResourceSubscribers.bind(
  //   this.sessionStore
  // );

  // getClientSubscriptions = this.sessionStore.getClientSubscriptions.bind(
  //   this.sessionStore
  // );

  // // subscriptions

  subscribeToResource<TResourceType extends SessionCollectionMapOfResourceKeys>(
    clientId: SessionClient['id'],
    resourceIdentifier: ResourceIdentifier<TResourceType>
  ) {
    this.socket?.emit(ServerSdkIO.requests.subscribeToResource, {
      clientId,
      resourceIdentifier,
    });
  }

  // subscribeToResource = this.sessionStore.subscribeToResource.bind(
  //   this.sessionStore
  // );

  // unsubscribeFromResource = this.sessionStore.unsubscribeFromResource.bind(
  //   this.sessionStore
  // );
}
