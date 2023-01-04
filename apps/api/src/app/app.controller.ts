import * as redisSDK from 'handy-redis';
import { Controller, Get, Param } from '@nestjs/common';
import { SessionStore } from '../services/session';
import { Store } from 'relational-redis-store';
import { ResourceIdentifierString } from '@mtm/server-sdk';

@Controller()
export class AppController {
  private session: SessionStore;

  constructor() {
    const redisClient = redisSDK.createHandyClient({
      url: 'redis://127.0.0.1:6379',
      family: 'IPv6',
    });
    this.session = new SessionStore(
      new Store(redisClient, { namespace: 'maha-1235' })
    );
  }

  @Get()
  async createClient() {
    // return '3'

    return await this.session.createClient().resolve();
  }

  @Get('resource')
  async createResource() {
    // return '3'

    return await this.session
      .createResource({
        resourceType: 'game',
        resourceData: {
          type: 'maha',
        },
      })
      .resolve();
  }

  @Get('subscribe/:clientId/:resourceIdentifierString')
  async subscribe(
    @Param()
    params: {
      clientId: string;
      resourceIdentifierString: ResourceIdentifierString<any>;
    }
  ) {
    // return x;

    // return params;

    return await this.session
      .subscribeToResource(params.clientId, params.resourceIdentifierString)
      .resolve();

    // return await this.session
    //   .createResource('game', {
    //     type: 'maha',
    //   })
    //   .resolve();
  }
}
