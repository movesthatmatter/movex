import * as z from 'zod';
import { objectKeys } from 'relational-redis-store';

export namespace ServerSdkIO {
  const zId = z.string;

  const unknownRecord = () => z.record(z.string(), z.unknown());

  type UnknownRecord = z.infer<ReturnType<typeof unknownRecord>>;

  const genericResourceIdentifier = () =>
    z.object({
      resourceType: z.string(),
      resourceId: zId(),
    });

  const toReqReq = <TReq extends z.ZodTypeAny>(req: TReq) =>
    z.object({
      req,
      res: req,
    });

  const toReqWithRes = <TReq extends z.ZodTypeAny, TRes extends z.ZodTypeAny>(
    req: TReq,
    res: TRes
  ) =>
    z.object({
      req,
      res,
    });

  function toReqRes<TReq extends z.ZodTypeAny>(
    req: TReq
  ): ReturnType<typeof toReqReq<TReq>>;
  function toReqRes<TReq extends z.ZodTypeAny, TRes extends z.ZodTypeAny>(
    req: TReq,
    res: TRes
  ): ReturnType<typeof toReqWithRes<TReq, TRes>>;
  function toReqRes<
    TReq extends z.ZodTypeAny,
    TRes extends z.ZodTypeAny = TReq
  >(req: TReq, res?: TRes) {
    return res ? toReqWithRes(req, res) : toReqReq(req);
  }

  const sessionClient = <TInfo extends z.ZodTypeAny>(info?: TInfo) =>
    z.object({
      id: zId(),
      subscriptions: z.record(
        z.string(),
        z.object({
          subscribedAt: z.number(), // This could be an ISO DateTime? not sure needed
        })
      ),
      info: info ? info : z.undefined().optional(),
    });

  const sessionResource = <TData extends z.ZodRecord>(data: TData) =>
    z.object({
      id: zId(),
      data,
      subscribers: z.record(
        sessionClient().shape.id,
        z.object({
          subscribedAt: z.number(), // This could be an ISO DateTime? not sure needed
        })
      ),
    });

  const genericSessionResource = () => sessionResource(unknownRecord());

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
        subscriptions: genericSessionResource().shape.subscribers,
      })
    ),

    // Resources
    createResource: toReqRes(
      z.object({
        resourceType: z.string(),
        resourceData: unknownRecord(),
        resourceId: zId().optional(),
      }),
      genericSessionResource()
    ),
    getResource: toReqRes(
      genericResourceIdentifier(),
      genericSessionResource()
    ),
    updateResource: toReqRes(
      z.object({
        resourceIdentifier: genericResourceIdentifier(),
        data: unknownRecord(),
      }),
      genericSessionResource()
    ),
    removeResource: toReqRes(
      z.object({
        resourceIdentifier: genericResourceIdentifier(),
      }),
      z.intersection(
        genericResourceIdentifier(),
        z.object({
          $removed: z.boolean(),
          subscribers: genericSessionResource().shape.subscribers,
        })
      )
    ),

    // Subscriptions
    subscribeToResource: toReqRes(
      z.object({
        clientId: zId(),
        resourceIdentifier: genericResourceIdentifier(),
      }),
      z.object({
        client: sessionClient(),
        resource: genericSessionResource(),
      })
    ),
    unsubscribeFromResource: toReqRes(
      z.object({
        clientId: zId(),
        resourceIdentifier: genericResourceIdentifier(),
      }),
      z.object({
        client: sessionClient(),
        resource: genericSessionResource(),
      })
    ),
  });

  export type Payloads = z.infer<typeof payloads>;

  const payloadsShape = payloads.shape;
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
}
