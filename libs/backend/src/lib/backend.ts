import { Server as SocketServer } from 'socket.io';
import express from 'express';
import http from 'node:http';
import https from 'node:https';
import {
  ServerSDK,
  ServerSDKConfig,
  SessionClient,
  toWsResponseResultPayloadOk,
  UnknownIdentifiableRecord,
  UnknownRecord,
} from '@mtm/server-sdk';
import crypto from 'crypto';
import { Result } from 'ts-results';
import { AsyncResult } from 'ts-async-results';
import * as ClientSdk from '@mtm/client-sdk';
import { SocketConnections } from './SocketConnections';
import { objectKeys } from './util';

const { ClientSdkIO } = ClientSdk.io;

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
  ) => Partial<{
    [ReqName in keyof RequestsCollectionMap]: (
      a: RequestsCollectionMap[ReqName][0]
    ) =>
      | Promise<RequestsCollectionMap[ReqName][1]>
      | Promise<Result<RequestsCollectionMap[ReqName][1], any>>
      | AsyncResult<RequestsCollectionMap[ReqName][1], any>;
  }>;
  resourceTransformers?: (
    serverSdk: ServerSDK<ClientInfo, ResourceCollectionMap>,
    client: SessionClient
  ) => Partial<{
    [ResourceName in keyof ResourceCollectionMap]: TransformerFn<
      ResourceCollectionMap[ResourceName],
      Promise<ResourceCollectionMap[ResourceName]>
    >;
  }>;
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
  // TODO: This comes from the config or system somehow if we need to track it!
  const serverInstanceId = crypto.randomUUID().slice(-3);

  const seshySDK = new ServerSDK<ClientInfo, ResourceCollectionMap>(sdkConfig);

  const unsunscribersFromSeshySdkConnection: (() => void)[] = [];

  seshySDK.connect().then((seshyConn) => {
    console.log('[backend] connected to seshy', seshyConn.id);

    const clientSocket: SocketServer = new SocketServer(httpServer, {
      cors: {
        origin: '*',
      },
    });

    const clientConnections = new SocketConnections();

    clientSocket.on('connection', async (clientConn) => {
      console.log('[backened] connected to client', clientConn.id);
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

      clientConnections.add(clientId, clientConn);

      if (!clientRes.ok) {
        console.error('[backened] client creation error', clientRes.val);

        return;
      }

      const $client = clientRes.val;

      // TODO: Here should, notify the client that the $client got created and requests can happen

      if (p.requestHandlers) {
        const requestHandlersMap = p.requestHandlers(seshySDK, $client);

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
      }

      seshyConn.onAny((event, req) => {
        console.log('[backend] seshy on any', event, req);
      });

      // if (p.resourceTransformers) {
      // This only makes sense for resources or clients to transform
      clientConn.onAny(async (event, req, acknowledgeCb) => {
        if (event === 'request') {
          return;
        }

        if (p.resourceTransformers) {
          const reqTransformer =
            (p.resourceTransformers as any)?.[event] || (() => req);
          const transformedReq = await reqTransformer(req);

          console.group('[backened] transforming:', `"${event}"`);
          console.debug(req);
          console.debug(transformedReq);
          console.groupEnd();

          seshyConn.emit(event, transformedReq, acknowledgeCb);

          return;
        }

        try {
          if (event === ClientSdkIO.msgNames.subscribeToResource) {
            const { resourceIdentifier } =
              ClientSdkIO.payloads.shape.subscribeToResource.shape.req.parse(
                req
              );

            return seshySDK
              .subscribeToResource(clientId, resourceIdentifier as any)
              .resolve()
              .then(acknowledgeCb);
          }

          if (event === ClientSdkIO.msgNames.observeResource) {
            const { resourceIdentifier } =
              ClientSdkIO.payloads.shape.observeResource.shape.req.parse(req);

            return seshySDK
              .observeResource(clientId, resourceIdentifier as any)
              .resolve()
              .then(acknowledgeCb);
          }

          if (event === ClientSdkIO.msgNames.unsubscribeFromResource) {
            const { resourceIdentifier } =
              ClientSdkIO.payloads.shape.unsubscribeFromResource.shape.req.parse(
                req
              );

            return seshySDK
              .unsubscribeFromResource(clientId, resourceIdentifier as any)
              .resolve()
              .then(acknowledgeCb);
          }

          if (event === ClientSdkIO.msgNames.updateResource) {
            const payload =
              ClientSdkIO.payloads.shape.updateResource.shape.req.parse(req);

            return (
              seshySDK
                .updateResourceAndBroadcast(
                  payload.resourceIdentifier as any,
                  payload.resourceData as any
                ) // TODO: fix this anys if given by the backend implementors can work with zod directly, but actually it shouldn't
                // because that can be further validated outside, this libs houldnt bother w/ that
                .resolve()
                .then(acknowledgeCb)
            );
          }

          console.info('[backened] proxying:', `"${event}"`);
          console.debug('[backened]', event, req);

          seshyConn.emit(event, req, () => {
            acknowledgeCb;
          });
        } catch (e) {
          console.error('[backend] Failed to Parse request', event, 'error', e);
        }
      });

      clientConn.on('disconnect', (reason) => {
        console.log('[backened] client disconnected', reason);

        clientConnections.remove(clientId);
        seshySDK.removeClient(clientId);
      });
    });

    unsunscribersFromSeshySdkConnection.push(
      seshySDK.onBroadcastToSubscribers((r) => {
        // console.log('')
        // clientConn.broadcast()

        // TODO: Broadcasting updates to clients
        // clientConn.emit('updateResource', r);
        // clientSocket.con()
        console.log('[backend] broadcasting', r.event, r.payload);

        // const {
        //   [clientId as keyof typeof r.subscribers]: removed,
        //   ...subscribersWithoutCurrent
        // } = r.subscribers || {};
        const subscribersWithoutCurrent = r.subscribers || {};

        console.log(
          '[backend] all connected',
          Object.keys(clientConnections.all)
        );
        console.log(
          '[backend] to subscribers',
          Object.keys(subscribersWithoutCurrent)
        );

        objectKeys(subscribersWithoutCurrent).forEach((clientId) => {
          console.log('[backened] broadcasting to clientId:', clientId);
          clientConnections
            .get(clientId)
            ?.emit(r.event, toWsResponseResultPayloadOk(r.payload));
        });
      })
    );
  });

  seshySDK.socket?.on('disconnect', () => {
    // TODO: Make sure this gets called and unset
    unsunscribersFromSeshySdkConnection.forEach((unsubscribe) => unsubscribe());
  });

  // return { backendSocket, seshy };
  // return seshySDK;
  return serverInstanceId;
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
