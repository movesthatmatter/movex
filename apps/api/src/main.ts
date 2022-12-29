/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { bootstrapServer } from './server';

bootstrapServer();

// import { Logger } from '@nestjs/common';
// import { NestFactory } from '@nestjs/core';

// import { AppModule } from './app/app.module';

// import { SessionStore } from './session/store';
// import { Store } from 'relational-redis-store';

// import { Server as SocketServer } from 'socket.io';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   const globalPrefix = 'api';
//   app.setGlobalPrefix(globalPrefix);
//   const port = process.env.PORT || 4444;

//   // const io = new SocketServer(app.getHttpServer(), {
//   //   cors: {
//   //     origin: '*',
//   //   },
//   // });

//   // console.log('waiting for socket connection');
//   // io.on('connection', (socket) => {
//   //   const { apiKey } = socket.handshake.query;

//   //   if (!apiKey) {
//   //     console.debug('Error connecting. No ApiKey');
//   //     return;
//   //   }

//   //   // if (
//   //   //   !(
//   //   //     typeof gameId === 'string' &&
//   //   //     typeof nickname === 'string' &&
//   //   //     gameId &&
//   //   //     nickname
//   //   //   )
//   //   // ) {
//   //   //   console.error('error connecting');
//   //   //   return;
//   //   // }

//   //   // socket.join(toGameRoomName(gameId));

//   //   console.log(apiKey, 'connected');

//   //   socket.on('disconnect', () => {
//   //     console.debug(apiKey, 'socket connection disconnected.');
//   //   });
//   // });

//   await app.listen(port);
//   Logger.log(
//     `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
//   );
// }
