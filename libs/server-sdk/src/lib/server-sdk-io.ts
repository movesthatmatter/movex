import * as z from 'zod';
import {
  objectKeys,
  genericResource,
  unknownRecord,
  zId,
  toReqRes,
  sessionClient,
  genericResourceIdentifier,
  serverResource,
} from '@matterio/core-util';

export namespace ServerSdkIO {
  export const payloads = z.object({
    // Clients
    createClient: toReqRes(
      z.object({
        id: zId().optional(),
        info: unknownRecord().optional(),
      }),
      sessionClient()
    ),
    getClient: toReqRes(
      z.object({
        id: zId(),
      }),
      sessionClient()
    ),
    removeClient: toReqRes(
      z.object({
        id: zId(),
      }),
      z.object({
        id: zId(),
        subscriptions: sessionClient().shape.subscriptions,
      })
    ),

    // Resources
    createResource: toReqRes(
      z.object({
        resourceIdentifier: z.object({
          resourceType: z.string(),
          resourceId: zId().optional(),
        }),
        resourceData: unknownRecord(),
      }),
      genericResource()
    ),
    getResource: toReqRes(
      z.object({
        resourceIdentifier: genericResourceIdentifier(),
      }),
      genericResource()
    ),
    updateResource: toReqRes(
      z.object({
        resourceIdentifier: genericResourceIdentifier(),
        resourceData: unknownRecord(),
      }),
      genericResource()
    ),
    removeResource: toReqRes(
      z.object({
        resourceIdentifier: genericResourceIdentifier(),
      }),
      z.object({
        // $removed: z.boolean(),
        resourceIdentifier: genericResourceIdentifier(),
        subscribers: genericResource().shape.subscribers,
      })
    ),

    // Subscriptions
    subscribeToResource: toReqRes(
      z.object({
        clientId: zId(),
        resourceIdentifier: genericResourceIdentifier(),
      }),
      z.object({
        client: sessionClient(),
        resource: genericResource(),
      })
    ),
    unsubscribeFromResource: toReqRes(
      z.object({
        clientId: zId(),
        resourceIdentifier: genericResourceIdentifier(),
      }),
      z.object({
        client: sessionClient(),
        resource: genericResource(),
      })
    ),

    // Native Resources

    // Matches
    createMatch: toReqRes(
      z.object({
        matcher: z.string(),
        playerCount: z.number(),

        players: z.array(zId()).optional(),
        game: unknownRecord(),
      })
    ),
  });

  export type Payloads = z.infer<typeof payloads>;

  const payloadsShape = payloads.shape;
  const msgNamesList = objectKeys(payloadsShape);

  export const msgNames = msgNamesList.reduce(
    (accum, next) => ({
      ...accum,
      [next]: next,
    }),
    {} as { [k in keyof typeof msgs]: k }
  );

  export const msgs = msgNamesList.reduce(
    (accum, next) => {
      return {
        ...accum,
        [next]: {
          // req: `req::${next}`,
          // res: `res::${next}`,
          // ToDo: this could be removed completely in favor of one map of "channels"
          //  The req/res only maps to emit => req, on => res. no need to change the naming as well
          req: next,
          res: next,
        },
      };
    },
    {} as {
      [k in keyof typeof payloadsShape]: {
        req: string;
        res: string;
      };
    }
  );

  const msgToResponseMap = z.object(
    objectKeys(msgs).reduce(
      (accum, next) => {
        return {
          ...accum,
          [next]: payloadsShape[next].shape.res,
        };
      },
      {} as {
        [k in keyof typeof msgs]: typeof payloadsShape[k]['shape']['res'];
      }
    )
  );

  export type MsgToResponseMap = z.infer<typeof msgToResponseMap>;

  const msgToRequestMap = z.object(
    objectKeys(msgs).reduce(
      (accum, next) => {
        return {
          ...accum,
          [next]: payloadsShape[next].shape.req,
        };
      },
      {} as {
        [k in keyof typeof msgs]: typeof payloadsShape[k]['shape']['req'];
      }
    )
  );

  export type MsgToRequestMap = z.infer<typeof msgToRequestMap>;
}
