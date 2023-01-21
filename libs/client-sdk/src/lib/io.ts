import * as z from 'zod';
import { objectKeys } from './util';

export namespace ClientSdkIO {
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

  // This is called clientResource b/c this is what gets sent to the client,
  //  but it could be namaed better probably
  export const clientResource = <
    TType extends string,
    TData extends z.ZodRecord
  >(
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

  // export type ClientResource = z.infer<typeof clientResource>;

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
      genericSessionResource()
    ),
    unsubscribeFromResource: toReqRes(
      z.object({
        resourceIdentifier: genericResourceIdentifier(),
      }),
      genericSessionResource()
    ),

    // Custom Requests
    request: toReqReq(z.unknown()),
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
}
