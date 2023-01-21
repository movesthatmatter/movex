import { Socket } from 'socket.io';

// TODO: this doesn't work with scale - more than one node
export class SocketConnections {
  private connections: Record<string, Socket> = {};

  add(id: string, connection: Socket) {
    this.connections[id] = connection;
  }

  remove(id: string) {
    const { [id]: removed, ...rest } = this.connections;

    this.connections = rest;
  }

  get(id: string) {
    return this.connections[id];
  }

  get all() {
    return this.connections;
  }
}
