import { Server as SocketServer } from 'socket.io';
import express from 'express';
import http from 'node:http';
import https from 'node:https';
import { ServerSDK, ServerSDKConfig } from '@mtm/server-sdk';
import crypto from 'crypto';

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

  const clientSocket: SocketServer = new SocketServer(httpServer, {
    cors: {
      origin: '*',
    },
  });

  // seshy.connect();

  const connectionToClientMap: Record<string, string> = {};

  // TODO: This comes from the config or system somehow if we need to track it!
  const serverInstanceId = crypto.randomUUID().slice(-3);

  clientSocket.on('connection', (clientConn) => {
    console.log(
      '[backened] client conn',
      clientConn.id,
      clientConn.handshake.query
    );
    // connectionToClientMapclientSocket.handshake]

    // seshySDK.createClient()

    // seshySDK.onBroadcastToSubscribers((r) => {
    //   console.log('[backened] gonna braodcast to', r.subscribers, r);
    //   console.log('[backened] gonna braodcast to conn', clientConn.id, clientConn.handshake);
    // });

    // The combo of serverId + conn.id is needed in order to ensure no duplicates
    //  when using multiple mahcines. Thinking BIG :D!
    const clientId = `${serverInstanceId}-${clientConn.id}`;

    seshySDK.createClient({ id: clientId });

    clientConn.on('disconnect', (reason) => {
      console.log('[backened] client disconnected', reason);

      seshySDK.removeClient(clientId);
    });

    const requestHandlersMap = p.requestHandlers
      ? p.requestHandlers(seshySDK)
      : {};

    clientConn.on(
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
    clientConn.onAny(async (event, req, acknowledgeCb) => {
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
