import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { SessionStore } from '../session/store';
import * as RRStore from 'relational-redis-store';
import * as redisSDK from 'handy-redis';
import { Store } from 'relational-redis-store';

@WebSocketGateway()
export class SdkGateway {
  @WebSocketServer()
  server?: Server;

  private session: SessionStore;

  constructor() {
    console.log('construced sdk');

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

  @SubscribeMessage('message')
  listenForMessages(@MessageBody() data: string) {
    console.log('api: msg received:', data);
    this.server?.sockets.emit('message_received', data);
  }

  @SubscribeMessage('req::createClient')
  createClientReq(@MessageBody() data: object) {
    this.session.createClient().map((r) => {
      this.server?.sockets.emit('res::createClient', r.item);
    });
  }
}
