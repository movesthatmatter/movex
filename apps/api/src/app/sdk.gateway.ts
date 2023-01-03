import { ServerSdkIO, WsResponseAsResult } from '@mtm/server-sdk';
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
  // @WebSocketServer()
  // private server?: Server;

  constructor(private readonly sessionService: SessionService) {}

  handleConnection(socket: Socket) {
    const token = getConnectionToken(socket);

    if (token) {
      this.sessionService.createSession(token);
    }
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

    return asyncResultToWsResponse(
      ServerSdkIO.msgs.createClient.res,
      session.createClient(msg).map((r) => r.item)
    );
  }

  // Resources

  @SubscribeMessage(ServerSdkIO.msgs.createResource.req)
  createResourceReq(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    msg: ServerSdkIO.Payloads['createResource']['req']
  ) {
    // TODO: This could be a Guard or smtg like that (a decorator)
    const token = getConnectionToken(socket);
    const session = token ? this.sessionService.getSession(token) : undefined;

    if (!session) {
      return;
    }

    return asyncResultToWsResponse(
      ServerSdkIO.msgs.createResource.res,
      session
        .createResource(msg.resourceType, msg.resourceData)
        .map((r) => r.item)
    );
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

    return asyncResultToWsResponse(
      ServerSdkIO.msgs.updateResource.res,
      session.updateResourceData(msg.resourceIdentifier, msg.data)
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

    return asyncResultToWsResponse(
      ServerSdkIO.msgs.subscribeToResource.res,
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

    return asyncResultToWsResponse(
      ServerSdkIO.msgs.unsubscribeFromResource.res,
      session.unsubscribeFromResource(msg.clientId, msg.resourceIdentifier)
    );
  }
}

const asyncResultToWsResponse = async <T, E>(
  event: string,
  ar: AsyncResult<T, E>
): Promise<WsResponseAsResult<T, E>> => {
  const r = await ar.resolve();

  return {
    event,
    data: r.ok
      ? {
          ok: true,
          err: false,
          val: r.val,
        }
      : {
          ok: false,
          err: true,
          val: r.val,
        },
  };
};

const getConnectionToken = (socket: Socket) => {
  return 'apiKey' in socket.handshake.query &&
    typeof socket.handshake.query.apiKey === 'string'
    ? socket.handshake.query.apiKey
    : undefined;
};
