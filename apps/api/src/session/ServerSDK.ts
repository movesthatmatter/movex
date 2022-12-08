import { SessionStore } from './store';

// This is what creates the bridge between the seshy api server and the client's server

export class ServerSDK {
  constructor(private sessionStore: SessionStore) {}

  // Client

  createClient = this.sessionStore.createClient.bind(this.sessionStore);

  getClient = this.sessionStore.getClient.bind(this.sessionStore);

  getClients = this.sessionStore.getAllClients.bind(this.sessionStore);

  getAllClients = this.sessionStore.getAllClients.bind(this.sessionStore);

  updateClient = this.sessionStore.updateClient.bind(this.sessionStore);

  removeClient = this.sessionStore.removeClient.bind(this.sessionStore);

  // Resource

  createResource = this.sessionStore.createResource.bind(this.sessionStore);

  removeResource = this.sessionStore.removeResource.bind(this.sessionStore);

  getResource = this.sessionStore.getResource.bind(this.sessionStore);

  getResourceSubscribers = this.sessionStore.getResourceSubscribers.bind(
    this.sessionStore
  );

  getClientSubscriptions = this.sessionStore.getClientSubscriptions.bind(
    this.sessionStore
  );

  // subscriptions

  subscribeToResource = this.sessionStore.subscribeToResource.bind(
    this.sessionStore
  );

  unsubscribeFromResource = this.sessionStore.unsubscribeFromResource.bind(
    this.sessionStore
  );
}
