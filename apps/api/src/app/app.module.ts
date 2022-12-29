import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SdkGateway } from './sdk.gateway';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, SdkGateway],
})
export class AppModule {}
