// import { SessionStore } from './store';
import { SessionClient } from '../session/types';
import { getSocketClient } from './socket';
import { Socket } from 'socket.io-client';
// import { Client } from './types';
import { Pubsy } from 'ts-pubsy';

// This is what creates the bridge between the seshy api server and the client's server
// via sockets

type Events = {
  createClient: SessionClient;
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
        this.handleIncomingMessage();
        resolve(this.socket!);
      });
    });
  }

  private handleIncomingMessage() {
    this.socket?.on('message_received', (data) => {
      console.log('msg received back', data);

      // TODO: This is where pubsy comes in!
      // setMessages((prev) => [...prev, data]);
    });

    this.socket?.on('res::createClient', (client: SessionClient) => {
      // client.
      this.pubsy.publish('createClient', client);
      console.log('sdk: client created', client);
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
    this.socket?.emit('req::createClient', p);

    // TODO: This must return a requestId, which will be used in the onResponse
  }

  onClientCreated(fn: (client: SessionClient) => void) {
    return this.pubsy.subscribe('createClient', fn);
  }
  // getClient = this.sessionStore.getClient.bind(this.sessionStore);

  // getClients = this.sessionStore.getAllClients.bind(this.sessionStore);

  // getAllClients = this.sessionStore.getAllClients.bind(this.sessionStore);

  // updateClient = this.sessionStore.updateClient.bind(this.sessionStore);

  // removeClient = this.sessionStore.removeClient.bind(this.sessionStore);

  // // Resource

  // createResource = this.sessionStore.createResource.bind(this.sessionStore);

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
