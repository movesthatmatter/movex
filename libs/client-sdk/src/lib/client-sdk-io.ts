import * as z from 'zod';
import {
  unknownRecord,
  zId,
  toReqReq,
  toReqRes,
  genericSessionResource,
  genericResourceIdentifier,
  objectKeys,
  sessionMatch,
} from '@matterio/core-util';

// This is called clientResource b/c this is what gets sent to the client,
//  but it could be namaed better probably
export const clientResource = <TType extends string, TData extends z.ZodRecord>(
  type: TType,
  data: TData
) =>
  z.object({
    type: z.literal(type),
    item: z.intersection(
      z.object({
        id: zId(),
      }),
      data
    ),
  });

export const genericClientResource = (type: string) =>
  clientResource(type, unknownRecord());

export const payloads = z.object({
  // Resources
  createResource: toReqRes(
    z.object({
      resourceIdentifier: z.object({
        resourceType: z.string(),
        resourceId: zId().optional(),
      }),
      resourceData: unknownRecord(),
    }),
    genericSessionResource()
  ),
  getResource: toReqRes(
    z.object({
      resourceIdentifier: genericResourceIdentifier(),
    }),
    genericSessionResource()
  ),
  observeResource: toReqRes(
    z.object({
      resourceIdentifier: genericResourceIdentifier(),
    }),
    genericSessionResource()
  ),
  updateResource: toReqRes(
    z.object({
      resourceIdentifier: genericResourceIdentifier(),
      resourceData: unknownRecord(),
    }),
    // genericSessionResource()
    genericClientResource('generic')
  ),
  removeResource: toReqRes(
    z.object({
      resourceIdentifier: genericResourceIdentifier(),
    }),
    z.intersection(
      genericResourceIdentifier(),
      z.object({
        // $removed: z.boolean(),
        subscribers: genericSessionResource().shape.subscribers,
      })
    )
  ),

  // Subscriptions
  subscribeToResource: toReqRes(
    z.object({
      resourceIdentifier: genericResourceIdentifier(),
    }),
    z.void()
  ),
  unsubscribeFromResource: toReqRes(
    z.object({
      resourceIdentifier: genericResourceIdentifier(),
    }),
    z.void()
  ),

  // Custom Requests
  request: toReqReq(z.unknown()),

  // Matches
  createMatch: toReqRes(
    z.object({
      matcher: z.string(),
      playerCount: z.number(),
      players: z.array(zId()).optional(),
      game: unknownRecord(),
    })
  ),
  getMatch: toReqRes(
    z.object({
      matchId: zId(),
    }),
    sessionMatch(unknownRecord())
  ),
  // subscribeToMatch: toReqRes(
  //   z.object({
  //     matchId: zId(),
  //   }),
  //   sessionMatch(unknownRecord())
  // ),
  joinMatch: toReqRes(
    z.object({
      matchId: zId(),
    }),
    sessionMatch(unknownRecord())
  ),
  leaveMatch: toReqRes(
    z.object({
      matchId: zId(),
    }),
    sessionMatch(unknownRecord())
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

export const msgs = objectKeys(payloadsShape).reduce(
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
