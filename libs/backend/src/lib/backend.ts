import { Server as SocketServer } from 'socket.io';
import express from 'express';
import http from 'node:http';
import https from 'node:https';
import {
  ServerSDK,
  ServerSDKConfig,
  SessionClient,
  UnknownIdentifiableRecord,
  UnknownRecord,
} from '@mtm/server-sdk';
import crypto from 'crypto';
import { Result } from 'ts-results';
import { AsyncResult } from 'ts-async-results';

type Config = ServerSDKConfig & {
  port?: number;
};

type TransformerFn<V, T> = (value: V) => V | T;

type RequestsCollectionMapBase = Record<string, [unknown, unknown]>;

type EventHandlers<
  ClientInfo extends UnknownRecord,
  ResourceCollectionMap extends Record<string, UnknownIdentifiableRecord>,
  RequestsCollectionMap extends RequestsCollectionMapBase
> = {
  requestHandlers?: (
    serverSdk: ServerSDK<ClientInfo, ResourceCollectionMap>,
    client: SessionClient
  ) => {
    [ReqName in keyof RequestsCollectionMap]: (
      a: RequestsCollectionMap[ReqName][0]
    ) =>
      | Promise<RequestsCollectionMap[ReqName][1]>
      | Promise<Result<RequestsCollectionMap[ReqName][1], any>>
      | AsyncResult<RequestsCollectionMap[ReqName][1], any>;
  };
  resourceTransformers?: (
    serverSdk: ServerSDK<ClientInfo, ResourceCollectionMap>,
    client: SessionClient
  ) => {
    [ResourceName in keyof ResourceCollectionMap]: TransformerFn<
      ResourceCollectionMap[ResourceName],
      Promise<ResourceCollectionMap[ResourceName]>
    >;
  };
};

export const mtmBackendWithExpress = <
  ClientInfo extends UnknownRecord,
  ResourceCollectionMap extends Record<string, UnknownIdentifiableRecord>,
  RequestsCollectionMap extends RequestsCollectionMapBase
>(
  httpServer: https.Server | http.Server,
  sdkConfig: ServerSDKConfig,
  p: EventHandlers<
    ClientInfo,
    ResourceCollectionMap,
    RequestsCollectionMap
  > = {}
) => {
  const seshySDK = new ServerSDK<ClientInfo, ResourceCollectionMap>(sdkConfig);

  const clientSocket: SocketServer = new SocketServer(httpServer, {
    cors: {
      origin: '*',
    },
  });

  // const connectionToClientMap: Record<string, string> = {};

  // TODO: This comes from the config or system somehow if we need to track it!
  const serverInstanceId = crypto.randomUUID().slice(-3);

  clientSocket.on('connection', async (clientConn) => {
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
    const clientRes = await seshySDK.createClient({ id: clientId }).resolve();

    if (!clientRes.ok) {
      console.error('[backened] client creation error', clientRes.val);

      return;
    }

    const $client = clientRes.val;

    // TODO: Here should, notify the client that the $client got created and requests can happen

    clientConn.on('disconnect', (reason) => {
      console.log('[backened] client disconnected', reason);

      seshySDK.removeClient(clientId);
    });

    const requestHandlersMap = p.requestHandlers
      ? p.requestHandlers(seshySDK, $client)
      : ({} as {
          [eventName in keyof RequestsCollectionMap]: (a: any) => Promise<any>;
        });

    clientConn.on(
      'request',
      async (
        [reqName, req]: [keyof RequestsCollectionMap, unknown],
        acknowledgeCb
      ) => {
        const handler = requestHandlersMap[reqName] || (() => req);

        const handled = handler(req);

        const handledReq = await (AsyncResult.isAsyncResult(handled)
          ? handled.resolve()
          : handled);

        console.group('[backened] On Request:', reqName);
        console.debug('[backened] Payload', req, '>', handledReq);
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
      console.group('[backened] OnAny');
      console.info('[backened] Event', event);
      console.debug('[backened] Req', req, '>', transformedReq);
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

export const mtmBackend = <
  ClientInfo extends UnknownRecord,
  ResourceCollectionMap extends Record<string, UnknownIdentifiableRecord>,
  RequestsCollectionMap extends RequestsCollectionMapBase
>(
  { port, ...sdkConfig }: Config,
  callback?: (server: http.Server | https.Server) => void,
  p: EventHandlers<
    ClientInfo,
    ResourceCollectionMap,
    RequestsCollectionMap
  > = {}
) => {
  const app = express();
  const server = http.createServer(app);

  const mtm = mtmBackendWithExpress(server, sdkConfig, p);

  server.listen(port, () => callback?.(server));

  return mtm;
};
