import {
  SessionClient,
  SessionResource,
  UnknownRecord,
} from '../session/types';
import { getSocketClient } from './socket.client';
import { Socket } from 'socket.io-client';
import { Pubsy } from 'ts-pubsy';
import {
  sessionSocketRequests as socketRequests,
  sessionSocketResponses as socketResponses,
} from './SessionSocketEvents';
import { WsResponseResultPayload } from './types';
import { SessionStoreCollectionMap } from '../session/store';
import {
  AnySessionResourceCollectionMap,
  OnlySessionCollectionMapOfResourceKeys,
  ResourceIdentifier,
  ResourceIdentifierString,
  UnknwownSessionResourceCollectionMap,
} from '../session/store/types';
import { UnidentifiableModel } from 'relational-redis-store';

// This is what creates the bridge between the seshy api server and the client's server
// via sockets

type Events = {
  createClient: SessionClient;

  createResource: SessionResource;

  subscribeToResource: {
    client: SessionClient;
    resource: SessionResource;
  };
};

export class SessionSDK<
  ClientInfo extends UnknownRecord = {},
  ResourceCollectionMap extends UnknwownSessionResourceCollectionMap = AnySessionResourceCollectionMap,
  SessionCollectionMap extends SessionStoreCollectionMap<ResourceCollectionMap> = SessionStoreCollectionMap<ResourceCollectionMap>,
  SessionCollectionMapOfResourceKeys extends OnlySessionCollectionMapOfResourceKeys<ResourceCollectionMap> = OnlySessionCollectionMapOfResourceKeys<ResourceCollectionMap>
> {
  private socket?: Socket;

  private pubsy = new Pubsy<Events>();

  constructor(
    // private sessionStore: SessionStore,
    private config: {
      url: string;
      apiKey: string;
    }
  ) {}

  async connect() {
    this.socket = getSocketClient({
      url: this.config.url,
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
      socketResponses.CreateClient,
      (clientResult: WsResponseResultPayload<SessionClient, unknown>) => {
        if (clientResult.ok) {
          this.pubsy.publish('createClient', clientResult.val);
        }
      }
    );

    // resources
    socket.on(
      socketResponses.CreateResource,
      (resourceResult: WsResponseResultPayload<SessionResource, unknown>) => {
        if (resourceResult.ok) {
          this.pubsy.publish('createResource', resourceResult.val);
        }
      }
    );

    // subscriptions
    socket.on(
      socketResponses.SubscribeToResource,
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
    this.socket?.emit(socketRequests.CreateClient, p);

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
    this.socket?.emit(socketRequests.CreateResource, {
      resourceType,
      resourceData,
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
    console.log('subscrubing to resource', clientId, resourceIdentifier, this.socket?.emit);

    this.socket?.emit(socketRequests.SubscribeToResource, {
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
