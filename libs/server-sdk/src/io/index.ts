import { objectKeys } from 'relational-redis-store';
import * as z from 'zod';

const unknownRecord = () => z.record(z.string(), z.unknown());

const genericResourceIdentifier = () =>
  z.object({
    resourceType: z.string(),
    resourceId: z.string(),
  });

export namespace ServerSdkIO {
  export const payloads = z.object({
    // Clients
    createClient: z.object({
      id: z.string().optional(),
      info: unknownRecord().optional(),
    }),

    // Resources
    createResource: z.object({
      resourceType: z.string(),
      resourceData: unknownRecord(),
    }),
    updateResource: z.object({
      resourceIdentifier: genericResourceIdentifier(),
      data: unknownRecord(),
    }),

    // Subscriptions
    subscribeToResource: z.object({
      clientId: z.string(),
      resourceIdentifier: genericResourceIdentifier(),
    }),
  });

  export type Payloads = z.infer<typeof payloads>;

  const payloadsShape = payloads.shape;
  export const { requests, responses } = objectKeys(payloadsShape).reduce(
    (accum, next) => {
      return {
        requests: {
          ...accum.requests,
          [next]: `req::${next}`,
        },
        responses: {
          ...accum.responses,
          [next]: `res::${next}`,
        },
      };
    },
    {
      responses: {} as { [k in keyof typeof payloadsShape]: string },
      requests: {} as { [k in keyof typeof payloadsShape]: string },
    }
  );
}
// This should be a map of the event name to event payload type via zod or smtg
// export enum SocketMesasges {
//   // Client
//   CreateClient,
//   GetClient,
//   UpdateClient,
//   RemoveClient,

//   // Resources
//   CreateResource,
//   UpdateResource,
//   RemoveResource,

//   // Subscriptions
//   SubscribeToResource,
//   UnsubscribeFromResource,
// }

// TODO: Might be better to pass in the variable instead of the string
//  as this will add more bytes to the sdk size
// export const sessionSocketRequest = (event: keyof typeof SessionSocketEvents) =>
//   `req::${event}`;
// export const sessionSocketResponse = (
//   event: keyof typeof SessionSocketEvents
// ) => `res::${event}`;
