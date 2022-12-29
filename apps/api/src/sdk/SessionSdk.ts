import { SessionClient, SessionResource } from '../session/types';
import { getSocketClient } from './socket';
import { Socket } from 'socket.io-client';
import { Pubsy } from 'ts-pubsy';
import {
  sessionSocketRequests as socketRequests,
  sessionSocketResponses as socketResponses,
} from './SessionSocketEvents';

// This is what creates the bridge between the seshy api server and the client's server
// via sockets

type Events = {
  createClient: SessionClient;
  createResource: SessionResource;
};

export class SessionSDK {
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
    socket.on(socketResponses.CreateClient, (client: SessionClient) => {
      this.pubsy.publish('createClient', client);
    });

    socket.on(socketResponses.CreateResource, (resource: SessionResource) => {
      this.pubsy.publish('createResource', resource);
    });
  }

  disconnect() {
    this.socket?.close();
  }

  // This are message that wait for a response
  // private emitAndWaitForResponse(topic: string, msg?: unknown) {
  //   this.socket?.emit(topic, msg);
  // }

  // Client

  // createClient = this.sessionStore.createClient.bind(this.sessionStore);

  createClient(p?: { id?: SessionClient['id']; info?: SessionClient['info'] }) {
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

  on = this.pubsy.subscribe.bind(this.pubsy);

  // // Resource

  createResource() {
    // console.log('asdas', sessionSocketResponse('CreateResource'));
    this.socket?.emit(socketRequests.CreateResource, {});
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

  // subscribeToResource = this.sessionStore.subscribeToResource.bind(
  //   this.sessionStore
  // );

  // unsubscribeFromResource = this.sessionStore.unsubscribeFromResource.bind(
  //   this.sessionStore
  // );
}
