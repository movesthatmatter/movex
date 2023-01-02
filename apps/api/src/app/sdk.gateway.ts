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

  @SubscribeMessage(ServerSdkIO.requests.createClient)
  createClientReq(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    msg: ServerSdkIO.Payloads['createClient']
  ) {
    const token = getConnectionToken(socket);
    const session = token ? this.sessionService.getSession(token) : undefined;

    if (!session) {
      return;
    }

    return asyncResultToWsResponse(
      ServerSdkIO.responses.createClient,
      session.createClient(msg).map((r) => r.item)
    );
  }

  @SubscribeMessage(ServerSdkIO.requests.createResource)
  createResourceReq(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    msg: ServerSdkIO.Payloads['createResource']
  ) {
    // TODO: This could be a Guard or smtg like that (a decorator)
    const token = getConnectionToken(socket);
    const session = token ? this.sessionService.getSession(token) : undefined;

    if (!session) {
      return;
    }

    return asyncResultToWsResponse(
      ServerSdkIO.responses.createResource,
      session
        .createResource(msg.resourceType, msg.resourceData)
        .map((r) => r.item)
    );
  }

  @SubscribeMessage(ServerSdkIO.requests.updateResource)
  updateResourceReq(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    msg: ServerSdkIO.Payloads['updateResource']
  ) {
    // TODO: This could be a Guard or smtg like that (a decorator)
    const token = getConnectionToken(socket);
    const session = token ? this.sessionService.getSession(token) : undefined;

    if (!session) {
      return;
    }

    return asyncResultToWsResponse(
      ServerSdkIO.responses.updateResource,
      session.updateResourceData(msg.resourceIdentifier, msg.data)
    );
  }

  @SubscribeMessage(ServerSdkIO.requests.subscribeToResource)
  subscribeToResourceReq(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    msg: ServerSdkIO.Payloads['subscribeToResource']
  ) {
    // TODO: This could be a Guard or smtg like that (a decorator)
    const token = getConnectionToken(socket);
    const session = token ? this.sessionService.getSession(token) : undefined;

    if (!session) {
      return;
    }

    return asyncResultToWsResponse(
      ServerSdkIO.responses.subscribeToResource,
      session.subscribeToResource(msg.clientId, msg.resourceIdentifier)
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
