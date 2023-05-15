import * as z from 'zod';

export const zId = z.string;

export const unknownRecord = () => z.record(z.string(), z.unknown());

export const unknownIdentifiableRecord = () =>
  z.intersection(z.object({ id: zId() }), unknownRecord());

export const genericResourceIdentifier = () =>
  z.union([
    z.object({
      resourceType: z.string(),
      resourceId: zId(),
    }),
    z.string(),
  ]);

export const toReqReq = <TReq extends z.ZodTypeAny>(req: TReq) =>
  z.object({
    req,
    res: req,
  });

export const toReqWithRes = <
  TReq extends z.ZodTypeAny,
  TRes extends z.ZodTypeAny
>(
  req: TReq,
  res: TRes
) =>
  z.object({
    req,
    res,
  });

export function toReqRes<TReq extends z.ZodTypeAny>(
  req: TReq
): ReturnType<typeof toReqReq<TReq>>;
export function toReqRes<TReq extends z.ZodTypeAny, TRes extends z.ZodTypeAny>(
  req: TReq,
  res: TRes
): ReturnType<typeof toReqWithRes<TReq, TRes>>;
export function toReqRes<
  TReq extends z.ZodTypeAny,
  TRes extends z.ZodTypeAny = TReq
>(req: TReq, res?: TRes) {
  return res ? toReqWithRes(req, res) : toReqReq(req);
}

// TODO: Rename to StoreResource and don't export
// TOOD: Move only in SessionStore maybe
export const movexClient = <TInfo extends z.ZodTypeAny>(info?: TInfo) =>
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

// const baseResource = z.object({
//   id: zId(),
//   subscribers:
//   ),
// });

export const resourceSubscribers = () =>
  z.record(
    movexClient().shape.id,
    z.object({
      subscribedAt: z.number(), // This could be an ISO DateTime? not sure needed
    })
  );

export const resource = <TType extends string, TData extends z.ZodRecord>(
  type: TType,
  data: TData
) =>
  z.object({
    id: zId(),
    type: z.literal(type),
    subscribers: resourceSubscribers(),
    item: z.intersection(z.object({ id: zId() }), data),
  });

// alias
export const serverResource = resource;

export const genericResource = () =>
  z.object({
    id: zId(),
    type: z.string(),
    subscribers: resourceSubscribers(),
    item: unknownIdentifiableRecord(),
  });

export const clientResource = <TType extends string, TData extends z.ZodRecord>(
  type: TType,
  data: TData
) =>
  z.object({
    id: zId(),
    type: z.literal(type),
    item: z.intersection(z.object({ id: zId() }), data),
  });

// export type ClientResource<
//   TResourceType extends string,
//   TData extends UnknownRecord
// > = {
//   type: TResourceType;
//   id: string;
//   item: {
//     id: string;
//   } & TData;
// };

export const genericClientResource = () =>
  z.object({
    id: zId(),
    type: z.string(),
    item: unknownIdentifiableRecord(),
  });

// TODO: Rename to StoreResource and don't export
// TOOD: Move only in SessionStore maybe
export const baseSessionMatch = <TGame extends z.ZodRecord>(game: TGame) =>
  z.object({
    id: zId(),
    playerTotal: z.number(),
    // waitTime:
    players: z.record(zId(), z.literal(true)),
    matcher: z.string(), // this is the matcher pattern: "chess" or "chess:5min" or "chess:5min:white", the more items the more limiting/accurate to match
    game,
  });

// TODO: Rename to StoreResource and don't export
// TOOD: Move only in SessionStore maybe
export const sessionMatch = baseSessionMatch;
