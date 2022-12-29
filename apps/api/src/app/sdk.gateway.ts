import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { SessionStore } from '../session/store';
import * as redisSDK from 'handy-redis';
import { Store } from 'relational-redis-store';
import { sessionSocketRequests, sessionSocketResponses } from '../sdk';

@WebSocketGateway()
export class SdkGateway {
  @WebSocketServer()
  server?: Server;

  private session: SessionStore;

  constructor() {
    //TODO: This needs to come from outside so it can be
    //  tested and dynamically configured
    const redisClient = redisSDK.createHandyClient({
      url: 'redis://127.0.0.1:6379',
      family: 'IPv6',
    });

    this.session = new SessionStore(
      new Store(redisClient, { namespace: 'tester-123456' })
    );
  }

  // @SubscribeMessage('message')
  // listenForMessages(@MessageBody() data: string) {
  //   console.log('api: msg received:', data);
  //   this.server?.sockets.emit('message_received', data);
  // }

  @SubscribeMessage(sessionSocketRequests.CreateClient)
  createClientReq(@MessageBody() data: object) {
    console.log('gateway creating client');
    this.session.createClient().map((r) => {
      this.server?.sockets.emit(sessionSocketResponses.CreateClient, r.item);
    });
  }

  @SubscribeMessage(sessionSocketRequests.CreateResource)
  createResourceReq(@MessageBody() data: object) {
    console.log('gateway creating resource');
    this.session.createResource('game', { type: 'maha' }).map((r) => {
      this.server?.sockets.emit(sessionSocketResponses.CreateResource, r.item);
    });
  }
}
