import { Controller, Get, Param } from '@nestjs/common';
import { ResourceIdentifierString } from '@mtm/server-sdk';
import { SessionService } from './session.service';

@Controller()
export class AppController {
  // private session: SessionStore;

  constructor(private readonly sessionService: SessionService) {}
  // constructor() {
  //   const redisClient = redisSDK.createHandyClient({
  //     url: 'redis://127.0.0.1:6379',
  //     family: 'IPv6',
  //   });
  //   this.session = new SessionStore(
  //     new Store(redisClient, { namespace: 'maha-1235' })
  //   );
  // }

  @Get()
  async createClient() {
    // return '3'

    return 'OK';
    // return await this.sessionService.getSession().getAllClients().
  }

  // @Get('resource')
  // async createResource() {
  //   // return '3'

  //   return await this.session
  //     .createResource({
  //       resourceType: 'game',
  //       resourceData: {
  //         type: 'maha',
  //       },
  //     })
  //     .resolve();
  // }

  // @Get('subscribe/:clientId/:resourceIdentifierString')
  // async subscribe(
  //   @Param()
  //   params: {
  //     clientId: string;
  //     resourceIdentifierString: ResourceIdentifierString<any>;
  //   }
  // ) {
  //   // return x;

  //   // return params;

  //   return await this.session
  //     .subscribeToResource(params.clientId, params.resourceIdentifierString)
  //     .resolve();

  //   // return await this.session
  //   //   .createResource('game', {
  //   //     type: 'maha',
  //   //   })
  //   //   .resolve();
  // }
}
