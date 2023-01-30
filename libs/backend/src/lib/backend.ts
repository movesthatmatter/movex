import { Server as SocketServer } from 'socket.io';
import express from 'express';
import http from 'node:http';
import https from 'node:https';
import {
  objectKeys,
  SessionClient,
  SessionResource,
  UnknownIdentifiableRecord,
  UnknownRecord,
  zId,
} from '@matterio/core-util';
import { ServerSDK, ServerSDKConfig } from '@matterio/server-sdk';
import { ClientSdkIO } from '@matterio/client-sdk';
import { Result } from 'ts-results';
import { AsyncResult } from 'ts-async-results';
import { SocketConnections } from './SocketConnections';
import * as z from 'zod';

type Config = ServerSDKConfig & {
  port?: number;
};

type TransformerFn<V, T> = (value: V) => V | T;

type RequestsCollectionMapBase = Record<string, [unknown, unknown]>;

type EventHandlers<
  ClientInfo extends UnknownRecord,
  GameState extends UnknownRecord,
  ResourceCollectionMap extends Record<string, UnknownIdentifiableRecord>,
  RequestsCollectionMap extends RequestsCollectionMapBase
> = {
  requestHandlers?: (p: {
    serverSdk: ServerSDK<ClientInfo, GameState, ResourceCollectionMap>;
    client: SessionClient;
    broadcastTo: <TEvent extends string, TMsg>(
      subscribers: SessionResource['subscribers'],
      event: TEvent,
      msg: TMsg
    ) => void;
  }) => Partial<{
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

const handshakeQueryPayload = z.object({
  clientId: zId().optional(),
});

export const matterioBackendWithExpress = <
  ClientInfo extends UnknownRecord,
  GameState extends UnknownRecord,
  ResourceCollectionMap extends Record<string, UnknownIdentifiableRecord>,
  RequestsCollectionMap extends RequestsCollectionMapBase
>(
  httpServer: https.Server | http.Server,
  sdkConfig: ServerSDKConfig,
  p: EventHandlers<
    ClientInfo,
    GameState,
    ResourceCollectionMap,
    RequestsCollectionMap
  > = {}
) => {
  // TODO: This comes from the config or system somehow if we need to track it!
  // const serverInstanceId = crypto.randomUUID().slice(-3);
  const clientConnections = new SocketConnections();

  const serverSdk = new ServerSDK<ClientInfo, GameState, ResourceCollectionMap>(
    sdkConfig
  );

  const unsunscribersFromserverSdkConnection: (() => void)[] = [];

  serverSdk.connect().then((seshyConn) => {
    console.log('[backend] connected to MatterioCloud', seshyConn.id);

    const clientSocket: SocketServer = new SocketServer(httpServer, {
      cors: {
        origin: '*',
      },
    });

    const broadcastTo = <TEvent extends string, TMsg>(
      subscribers: SessionResource['subscribers'],
      event: TEvent,
      msg: TMsg
    ) => {
      console.log('[backend] broadcast', event, Object.keys(subscribers));

      objectKeys(subscribers).forEach((clientId) => {
        console.log('[backened] broadcasting to clientId:', clientId);
        clientConnections
          .getByClientId(clientId)
          // It isn't needed to wap it in toWsResponseResultPayloadOk here, since it's custom!
          //  and there's no request/response
          // ?.emit(`broadcast::${event}`, toWsResponseResultPayloadOk(msg));
          ?.emit(`broadcast::${event}`, msg);
      });
    };

    clientSocket.on('connection', async (clientConn) => {
      // console.log('[backened] connected to client', clientConn.id);
      // connectionToClientMapclientSocket.handshake]

      // serverSdk.createClient()

      // serverSdk.onBroadcastToSubscribers((r) => {
      //   console.log('[backened] gonna braodcast to', r.subscribers, r);
      //   console.log('[backened] gonna braodcast to conn', clientConn.id, clientConn.handshake);
      // });

      // The combo of serverId + conn.id is needed in order to ensure no duplicates
      //  when using multiple mahcines. Thinking BIG :D!
      // const clientId = `${serverInstanceId}-${crypto.randomUUID()}`;

      // const clientId = `${serverInstanceId}-${clientConn.id}`;

      // TODO: Inside the handshake the given client id can be given and passed further
      // const givenClientId = clientSocketConn.handshake.query.clientId;
      const handshake = handshakeQueryPayload.safeParse(
        clientConn.handshake.query
      );

      if (!handshake.success) {
        // Cannot proceed as the handshake doesn't work
        // TODO: Send a error or smtg
        console.error(
          '[backened] Connection Handhsake Erorr',
          clientConn.handshake
        );
        return;
      }

      console.log('[backend] connection handshake', handshake);

      const clientId = clientConnections.add(
        clientConn,
        handshake.data.clientId
      );

      // const clientId = clientConnections.generateClientId();
      const clientRes = await serverSdk
        .createClient({ id: clientId })
        .resolve();

      // clientConnections.add(clientId, clientConn);

      if (!clientRes.ok) {
        console.error('[backened] client creation error', clientRes.val);

        return;
      }

      const $client = clientRes.val;

      clientConn.emit('$clientConnected', { clientId });

      // TODO: Here should, notify the client that the $client got created and requests can happen

      if (p.requestHandlers) {
        const requestHandlersMap = p.requestHandlers({
          serverSdk: serverSdk,
          client: $client,
          broadcastTo,
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
      }

      // seshyConn.onAny((event, req) => {
      //   console.log('[backend] seshy on any', event, req);
      // });

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

            return serverSdk
              .subscribeToResource(clientId, resourceIdentifier as any)
              .resolve()
              .then(acknowledgeCb);
          }

          if (event === ClientSdkIO.msgNames.observeResource) {
            const { resourceIdentifier } =
              ClientSdkIO.payloads.shape.observeResource.shape.req.parse(req);

            return serverSdk
              .observeResource(clientId, resourceIdentifier as any)
              .resolve()
              .then(acknowledgeCb);
          }

          if (event === ClientSdkIO.msgNames.unsubscribeFromResource) {
            const { resourceIdentifier } =
              ClientSdkIO.payloads.shape.unsubscribeFromResource.shape.req.parse(
                req
              );

            return serverSdk
              .unsubscribeFromResource(clientId, resourceIdentifier as any)
              .resolve()
              .then(acknowledgeCb);
          }

          if (event === ClientSdkIO.msgNames.updateResource) {
            const payload =
              ClientSdkIO.payloads.shape.updateResource.shape.req.parse(req);

            return (
              serverSdk
                .updateResourceAndBroadcast(
                  payload.resourceIdentifier as any,
                  payload.resourceData as any
                ) // TODO: fix this anys if given by the backend implementors can work with zod directly, but actually it shouldn't
                // because that can be further validated outside, this libs houldnt bother w/ that
                .resolve()
                .then(acknowledgeCb)
            );
          }

          if (event === ClientSdkIO.msgNames.createMatch) {
            const payload =
              ClientSdkIO.payloads.shape.createMatch.shape.req.parse(req);

            return serverSdk
              .createMatch({
                ...payload,
                // TODO: fix this anys if given by the backend implementors can work with zod directly, but actually it shouldn't
                // because that can be further validated outside, this libs houldnt bother w/ that
                game: payload.game as GameState,
              })
              .resolve()
              .then(acknowledgeCb);
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

        clientConnections.removeByClientId(clientId);
        serverSdk.removeClient(clientId);
      });
    });

    unsunscribersFromserverSdkConnection.push(
      serverSdk.onBroadcastToSubscribers((r) => {
        broadcastTo(r.subscribers, r.event, r.payload);
      })
    );
  });

  serverSdk.socket?.on('disconnect', () => {
    // TODO: Make sure this gets called and unset
    unsunscribersFromserverSdkConnection.forEach((unsubscribe) =>
      unsubscribe()
    );
  });

  // return { backendSocket, seshy };
  // return serverSdk;
  return clientConnections.instanceId;
};

export const matterioBackend = <
  ClientInfo extends UnknownRecord,
  GameState extends UnknownRecord,
  ResourceCollectionMap extends Record<string, UnknownIdentifiableRecord>,
  RequestsCollectionMap extends RequestsCollectionMapBase
>(
  { port, ...sdkConfig }: Config,
  callback?: (server: http.Server | https.Server) => void,
  p: EventHandlers<
    ClientInfo,
    GameState,
    ResourceCollectionMap,
    RequestsCollectionMap
  > = {}
) => {
  const app = express();
  const server = http.createServer(app);

  const mtm = matterioBackendWithExpress(server, sdkConfig, p);

  server.listen(port, () => callback?.(server));

  return mtm;
};
