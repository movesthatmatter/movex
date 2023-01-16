import { Server as SocketServer } from 'socket.io';
import express from 'express';
import http from 'node:http';
import https from 'node:https';
import { ServerSDK, ServerSDKConfig } from '@mtm/server-sdk';

type Config = ServerSDKConfig & {
  port?: number;
};

type TransformerFn<V, T> = (value: V) => V | T;

type EventHandlers = {
  requestHandlers?: (serverSdk: any) => {
    // This should be the ServerSDK
    // [eventName in string]: TransformerFn<>;
    [eventName in string]: (a: any) => Promise<any>;
  };
  resourceTransformers?: (serverSdk: any) => {
    // This should be the ServerSDK
    // [eventName in string]: TransformerFn<>;
    [eventName in string]: (a: any) => Promise<any>;
  };
};

export const mtmBackendWithExpress = <TEvents extends {}>(
  httpServer: https.Server | http.Server,
  sdkConfig: ServerSDKConfig,
  p: EventHandlers = {}
) => {
  const seshySDK = new ServerSDK(sdkConfig);

  const backendSocket: SocketServer = new SocketServer(httpServer, {
    cors: {
      origin: '*',
    },
  });

  // seshy.connect();

  backendSocket.on('connection', (serverSocket) => {
    const requestHandlersMap = p.requestHandlers
      ? p.requestHandlers(seshySDK)
      : {};

    serverSocket.on(
      'request',
      async ([reqName, req]: [string, unknown], acknowledgeCb) => {
        const handler = requestHandlersMap[reqName] || (() => req);
        const handledReq = await handler(req);

        console.group('[proxy] On Request:', reqName);
        console.debug('Payload', req, '>', handledReq);
        console.groupEnd();

        acknowledgeCb(handledReq);
      }
    );

    // This only makes sense for resources or clients to transform
    serverSocket.onAny(async (event, req, acknowledgeCb) => {
      if (event === 'request') {
        return;
      }

      const reqTransformer =
        (p.resourceTransformers as any)?.[event] || (() => req);
      const transformedReq = await reqTransformer(req);

      // console.log('[proxy] received from clientSDK', event, req, 'Sending to seshy:', transformedReq);
      // const transformedRequest = transformer(req);
      console.group('[proxy] OnAny');
      console.info('Event', event);
      console.debug('Req', req, '>', transformedReq);
      console.groupEnd();

      seshySDK.socket?.emit(event, transformedReq, acknowledgeCb);

      // seshy.socket?.emit(event, msg, async (response: any) => {
      //   console.log('[proxy] event', event, 'response from seshy:', response);

      //   // if (eventTransformers[event]) {
      //   //   const transformed = eventTransformers[event](response);
      //   //   acknowledgeCb(transformed);
      //   // } else {
      //   //   acknowledgeCb(response);
      //   // }
      // });
    });
  });

  // return { backendSocket, seshy };
  return seshySDK;
};

export const mtmBackend = (
  { port, ...sdkConfig }: Config,
  callback?: (server: http.Server | https.Server) => void,
  p: EventHandlers = {}
) => {
  const app = express();
  const server = http.createServer(app);

  const mtm = mtmBackendWithExpress(server, sdkConfig, p);

  server.listen(port, () => callback?.(server));

  return mtm;
};
