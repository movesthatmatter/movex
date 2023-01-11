import { Module, Provider } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SdkGateway } from './sdk.gateway';
import { SessionService } from './session.service';

import * as redisSDK from 'handy-redis';
import { config } from '../config';

export type Redis = redisSDK.IHandyRedis;

const RedisProvider: Provider<Redis> = {
  provide: 'Redis',
  useFactory: () =>
    redisSDK.createHandyClient({
      url: config.REDIS_URL,
      family: 'IPv6',
    }),
};

// const SessionStoreProvider: Provider<SessionStore> = {
//   provide: 'SessionStore',
//   useFactory: (redis: Redis) => {
//     return new SessionStore(new Store(redis, { namespace: 'tester-123456' }));
//   },
//   inject: [{ token: 'Redis', optional: false }],
// };

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    AppService,
    SdkGateway,
    RedisProvider,
    SessionService,
    // SessionStoreProvider,
  ],
})
export class AppModule {}
