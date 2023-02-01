import { Socket } from 'socket.io';
import crypto from 'crypto';

// TODO: this doesn't work with scale - more than one node
export class SocketConnections {
  private connectionsById: Record<Socket['id'], Socket> = {};
  private connectionsClientsMap: Record<string, string> = {};

  constructor(public instanceId: string = crypto.randomUUID().slice(-3)) {}

  generateClientId = () => `s${this.instanceId}:${crypto.randomUUID()}`;
  // addClient(clientId?: string) {

  // }

  add(connection: Socket, clientId: string = this.generateClientId()) {
    this.connectionsById[connection.id] = connection;

    this.connectionsClientsMap[encodeClientId(clientId)] = connection.id;
    this.connectionsClientsMap[encodeConnectionId(connection.id)] = clientId;

    return clientId;
  }

  removeByConnectionId(connId: string) {
    const clientId = this.connectionsClientsMap[connId];

    const { [connId]: _, ...restConnectionsById } = this.connectionsById;

    const {
      [clientId]: __,
      [connId]: ___,
      ...restConnectionsToClientMap
    } = this.connectionsClientsMap;

    this.connectionsById = restConnectionsById;
    this.connectionsClientsMap = restConnectionsToClientMap;
  }

  removeByClientId(clientId: string) {
    return this.removeByConnectionId(
      this.connectionsClientsMap[encodeClientId(clientId)]
    );
  }

  getByConnectionId(connId: string) {
    return this.connectionsById[connId];
  }

  getByClientId(clientId: string) {
    return this.getByConnectionId(
      this.connectionsClientsMap[encodeClientId(clientId)]
    );
  }

  get all() {
    return this.connectionsById;
  }

  get allConnectionsClientsMap() {
    return this.connectionsClientsMap;
  }
}

const CONN_PREFIX = '_conn:';
type EncodedConnectionId = `${typeof CONN_PREFIX}${string}`;

const encodeConnectionId = (id: string): EncodedConnectionId =>
  `${CONN_PREFIX}${id}`;
const decodeConnectionId = (encodedId: EncodedConnectionId): string =>
  encodedId.slice(CONN_PREFIX.length);

const CLIENT_PREFIX = '_client:';
type EncodedClientId = `${typeof CLIENT_PREFIX}${string}`;

const encodeClientId = (id: string): EncodedClientId => `${CLIENT_PREFIX}${id}`;
const decodeClientId = (encodedId: EncodedClientId): string =>
  encodedId.slice(CLIENT_PREFIX.length);
