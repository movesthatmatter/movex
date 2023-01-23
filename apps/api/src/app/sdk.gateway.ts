import {
  ServerSdkIO,
  toWsResponseResultPayloadErr,
  toWsResponseResultPayloadOk,
} from '@matterio/server-sdk';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AsyncResult } from 'ts-async-results';
import { SessionService } from './session.service';

@WebSocketGateway()
export class SdkGateway {
  constructor(private readonly sessionService: SessionService) {}

  handleConnection(socket: Socket) {
    const token = getConnectionToken(socket);

    if (token) {
      this.sessionService.createSession(token);
    }

    console.log('[Seshy] Backend Connected:', token);

    socket.on('disconnect', () => {
      console.log('[Seshy] Backend Disconnected:', token);

      const session = token ? this.sessionService.getSession(token) : undefined;

      if (!session) {
        return;
      }

      session.removeAllClients();
    });

    // TODO: Add a way to remove all clients from this server when this server is going down!
  }

  // Clients

  @SubscribeMessage(ServerSdkIO.msgs.createClient.req)
  createClientReq(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    msg: ServerSdkIO.Payloads['createClient']['req']
  ) {
    const token = getConnectionToken(socket);
    const session = token ? this.sessionService.getSession(token) : undefined;

    if (!session) {
      return;
    }

    return acknowledge(session.createClient(msg).map((r) => r.item));
  }

  @SubscribeMessage(ServerSdkIO.msgs.getClient.req)
  async getClientReq(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    req: ServerSdkIO.Payloads['getClient']['req']
  ) {
    // TODO: This could be a Guard or smtg like that (a decorator)
    const token = getConnectionToken(socket);
    const session = token ? this.sessionService.getSession(token) : undefined;

    if (!session) {
      return;
    }

    return acknowledge(session.getClient(req.id));
  }

  @SubscribeMessage(ServerSdkIO.msgs.removeClient.req)
  async removeClientReq(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    req: ServerSdkIO.Payloads['removeClient']['req']
  ) {
    // TODO: This could be a Guard or smtg like that (a decorator)
    const token = getConnectionToken(socket);
    const session = token ? this.sessionService.getSession(token) : undefined;

    if (!session) {
      return;
    }

    return acknowledge(session.removeClient(req.id).map((r) => r.item));
  }

  // Resources

  @SubscribeMessage(ServerSdkIO.msgs.createResource.req)
  createResourceReq(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    req: ServerSdkIO.Payloads['createResource']['req']
  ) {
    // TODO: This could be a Guard or smtg like that (a decorator)
    const token = getConnectionToken(socket);
    const session = token ? this.sessionService.getSession(token) : undefined;

    if (!session) {
      return;
    }

    return acknowledge(
      session
        .createResource({
          resourceType: req.resourceIdentifier.resourceType,
          resourceId: req.resourceIdentifier.resourceId,
          resourceData: req.resourceData,
        })
        .map((r) => r.item)
    );
  }

  @SubscribeMessage(ServerSdkIO.msgs.getResource.req)
  async getResourceReq(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    req: ServerSdkIO.Payloads['getResource']['req']
  ) {
    // TODO: This could be a Guard or smtg like that (a decorator)
    const token = getConnectionToken(socket);
    const session = token ? this.sessionService.getSession(token) : undefined;

    if (!session) {
      return;
    }

    return acknowledge(session.getResource(req.resourceIdentifier));
  }

  @SubscribeMessage(ServerSdkIO.msgs.updateResource.req)
  updateResourceReq(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    msg: ServerSdkIO.Payloads['updateResource']['req']
  ) {
    // TODO: This could be a Guard or smtg like that (a decorator)
    const token = getConnectionToken(socket);
    const session = token ? this.sessionService.getSession(token) : undefined;

    if (!session) {
      return;
    }

    return acknowledge(
      session.updateResourceData(msg.resourceIdentifier, msg.resourceData)
    );
  }

  @SubscribeMessage(ServerSdkIO.msgs.removeResource.req)
  removeResourceReq(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    msg: ServerSdkIO.Payloads['removeResource']['req']
  ) {
    // TODO: This could be a Guard or smtg like that (a decorator)
    const token = getConnectionToken(socket);
    const session = token ? this.sessionService.getSession(token) : undefined;

    if (!session) {
      return;
    }

    return acknowledge(
      session.removeResource(msg.resourceIdentifier).map((r) => r.item)
    );
  }

  // Subscriptions

  @SubscribeMessage(ServerSdkIO.msgs.subscribeToResource.req)
  subscribeToResourceReq(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    msg: ServerSdkIO.Payloads['subscribeToResource']['req']
  ) {
    // TODO: This could be a Guard or smtg like that (a decorator)
    const token = getConnectionToken(socket);
    const session = token ? this.sessionService.getSession(token) : undefined;

    if (!session) {
      return;
    }

    return acknowledge(
      session.subscribeToResource(msg.clientId, msg.resourceIdentifier)
    );
  }

  @SubscribeMessage(ServerSdkIO.msgs.unsubscribeFromResource.req)
  unsubscribeToResourceReq(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    msg: ServerSdkIO.Payloads['unsubscribeFromResource']['req']
  ) {
    // TODO: This could be a Guard or smtg like that (a decorator)
    const token = getConnectionToken(socket);
    const session = token ? this.sessionService.getSession(token) : undefined;

    if (!session) {
      return;
    }

    return acknowledge(
      session.unsubscribeFromResource(msg.clientId, msg.resourceIdentifier)
    );
  }
}

const acknowledge = async <T, E>(ar: AsyncResult<T, E>) => {
  const r = await ar.resolve();

  return r.ok
    ? toWsResponseResultPayloadOk(r.val)
    : toWsResponseResultPayloadErr(r.val);
};

const getConnectionToken = (socket: Socket) => {
  return 'apiKey' in socket.handshake.query &&
    typeof socket.handshake.query.apiKey === 'string'
    ? socket.handshake.query.apiKey
    : undefined;
};
