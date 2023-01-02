import {
  ResourceIdentifier,
  sessionSocketRequests,
  sessionSocketResponses,
  UnknownRecord,
  WsResponseAsResult,
} from '@mtm/server-sdk';
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

  @SubscribeMessage(sessionSocketRequests.CreateClient)
  createClientReq(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    msg: {
      id?: string;
      info?: UnknownRecord;
    }
  ) {
    // console.log('create client socket', getConnectionToken(socket));

    const token = getConnectionToken(socket);
    const session = token ? this.sessionService.getSession(token) : undefined;

    if (!session) {
      return;
    }

    return asyncResultToWsResponse(
      sessionSocketResponses.CreateClient,
      session.createClient(msg).map((r) => r.item)
    );
  }

  @SubscribeMessage(sessionSocketRequests.CreateResource)
  createResourceReq(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    msg: {
      resourceType: string;
      resourceData: UnknownRecord;
    }
  ) {
    // TODO: This could be a Guard or smtg like that (a decorator)
    const token = getConnectionToken(socket);
    const session = token ? this.sessionService.getSession(token) : undefined;

    if (!session) {
      return;
    }

    return asyncResultToWsResponse(
      sessionSocketResponses.CreateResource,
      session
        .createResource(msg.resourceType, msg.resourceData)
        .map((r) => r.item)
    );
  }

  @SubscribeMessage(sessionSocketRequests.UpdateResource)
  updateResourceReq(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    msg: {
      resourceIdentifier: ResourceIdentifier<any>;
      data: Partial<any>;
    }
  ) {
    // TODO: This could be a Guard or smtg like that (a decorator)
    const token = getConnectionToken(socket);
    const session = token ? this.sessionService.getSession(token) : undefined;

    if (!session) {
      return;
    }

    return asyncResultToWsResponse(
      sessionSocketResponses.UpdateResource,
      session.updateResourceData(msg.resourceIdentifier, msg.data)
    );
  }

  @SubscribeMessage(sessionSocketRequests.SubscribeToResource)
  subscribeToResourceReq(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    msg: {
      clientId: string;
      resourceIdentifier: ResourceIdentifier<any>;
    }
  ) {
    // TODO: This could be a Guard or smtg like that (a decorator)
    const token = getConnectionToken(socket);
    const session = token ? this.sessionService.getSession(token) : undefined;

    if (!session) {
      return;
    }

    return asyncResultToWsResponse(
      sessionSocketResponses.SubscribeToResource,
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
