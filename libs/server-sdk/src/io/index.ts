import { objectKeys } from 'relational-redis-store';
import * as z from 'zod';

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

  // export type SessionClient<Info extends UnknownRecord = {}> = {
  //   id: string;
  //   info?: Info; // User Info or whatever
  //   subscriptions: Record<
  //     `${SessionResourceType}:${SessionResource['id']}`,
  //     {
  //       // resourceType: string; // TODO: This could be part of the resource id
  //       subscribedAt: number;
  //     }
  //   >;

  //   // TODO: Add later on
  //   // lag: number;
  //   // createdAt: number;
  //   // upadtedAt: number;
  //   // lastPingAt: mumber;
  //   // status: 'idle' | 'active' | etc..
  // };
  export const sessionClient = <TInfo extends z.ZodTypeAny>(info?: TInfo) =>
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

  // export type SessionResource<TData extends UnknownRecord = {}> =
  // CollectionMapBaseItem & {
  //   id: string;
  //   data: TData;
  //   subscribers: Record<
  //     SessionClient['id'],
  //     {
  //       subscribedAt: number;
  //     }
  //   >;
  // };

  export const sessionResource = <TData extends z.ZodRecord>(data: TData) =>
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

  export const genericSessionResource = () => sessionResource(unknownRecord());

  export const payloads = z.object({
    // Clients
    createClient: toReqRes(
      z.object({
        id: zId().optional(),
        info: unknownRecord().optional(),
      }),
      sessionClient()
    ),

    // Resources
    createResource: toReqRes(
      z.object({
        resourceType: z.string(),
        resourceData: unknownRecord(),
      }),
      genericSessionResource()
    ),
    updateResource: toReqRes(
      z.object({
        resourceIdentifier: genericResourceIdentifier(),
        data: unknownRecord(),
      }),
      genericSessionResource()
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
          req: `req::${next}`,
          res: `res::${next}`,
        },
        // requests: {
        //   ...accum.requests,
        //   [next]: `req::${next}`,
        // },
        // responses: {
        //   ...accum.responses,
        //   [next]: `res::${next}`,
        // },
      };
    },
    {
      // responses: {} as { [k in keyof typeof payloadsShape]: string },
      // requests: {} as { [k in keyof typeof payloadsShape]: string },
    } as {
      [k in keyof typeof payloadsShape]: {
        req: string;
        res: string;
      };
    }
  );
}
