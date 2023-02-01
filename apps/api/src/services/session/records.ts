import { sessionClient, unknownRecord, zId } from '@matterio/core-util';
import z from 'zod';

// @deprecate
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
