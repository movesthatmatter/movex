import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { SessionStore } from '../session/store';
import { sessionSocketRequests, sessionSocketResponses } from '../sdk';
import { AsyncResult } from 'ts-async-results';
import { WsResponseAsResult } from '../sdk/types';
import { Inject } from '@nestjs/common';
import { SessionService } from './session.service';

@WebSocketGateway()
export class SdkGateway {
  // @WebSocketServer()
  // private server?: Server;

  constructor(private readonly sessionService: SessionService) {
    // this.server?.sockets.on('connect', (socket) => {
    //   console.log('gatway socket connected', socket);
    // });
    console.log('gateway instnantiated');
  }

  handleConnection(socket: Socket) {
    const token = getConnectionToken(socket);

    if (token) {
      console.log('connection to socket... token:', token);

      this.sessionService.createSession(token);
    }
  }

  @SubscribeMessage(sessionSocketRequests.CreateClient)
  createClientReq(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: object
  ) {
    // console.log('create client socket', getConnectionToken(socket));

    const token = getConnectionToken(socket);
    const session = token ? this.sessionService.getSession(token) : undefined;

    if (!session) {
      return;
    }

    return asyncResultToWsResponse(
      sessionSocketResponses.CreateClient,
      session.createClient().map((r) => r.item)
    );
  }

  @SubscribeMessage(sessionSocketRequests.CreateResource)
  createResourceReq(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: object
  ) {
    // TODO: This could be a Guard or smtg like that (a decorator)
    const token = getConnectionToken(socket);
    const session = token ? this.sessionService.getSession(token) : undefined;

    if (!session) {
      return;
    }

    return asyncResultToWsResponse(
      sessionSocketResponses.CreateResource,

      session.createResource('game', { type: 'maha' }).map((r) => r.item)
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
