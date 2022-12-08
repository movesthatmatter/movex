import * as redisSDK from 'handy-redis';
import { Controller, Get, Param } from '@nestjs/common';
import { AppService } from './app.service';
import { SessionStore } from '../session/store';
import { Store } from 'relational-redis-store';
import { ResourceIdentifierString } from '../session/store/types';

@Controller()
export class AppController {
  private session: SessionStore;

  constructor(private readonly appService: AppService) {
    const redisClient = redisSDK.createHandyClient({
      url: 'redis://127.0.0.1:6379',
      family: 'IPv6',
    });
    this.session = new SessionStore(
      new Store(redisClient, { namespace: 'maha-1234' })
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
      .createResource('game', {
        type: 'maha',
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
