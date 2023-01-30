import * as z from 'zod';

export const zId = z.string;

export const unknownRecord = () => z.record(z.string(), z.unknown());

export const genericResourceIdentifier = () =>
  z.object({
    resourceType: z.string(),
    resourceId: zId(),
  });

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

export const baseSessionMatch = <TGame extends z.ZodRecord>(game: TGame) =>
  z.object({
    id: zId(),
    playerCount: z.number(),
    // waitTime:
    players: z.record(zId(), z.undefined()),
    matcher: z.string(), // this is the matcher pattern: "chess" or "chess:5min" or "chess:5min:white", the more items the more limiting/accurate to match
    game,
  });

export const sessionMatch = baseSessionMatch;
