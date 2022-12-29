import { objectKeys } from 'relational-redis-store';

export enum SessionSocketEvents {
  // Client
  CreateClient,
  GetClient,
  UpdateClient,
  RemoveClient,

  // Resources
  CreateResource,
  UpdateResource,
  RemoveResource,

  // Subscriptions
  SubscribeToResource,
  UnsubscribeFromResource,
}

export const {
  requests: sessionSocketRequests,
  responses: sessionSocketResponses,
} = objectKeys(SessionSocketEvents).reduce(
  (accum, next) => {
    return {
      requests: {
        ...accum.requests,
        [next]: `req::${SessionSocketEvents[next]}`,
      },
      responses: {
        ...accum.responses,
        [next]: `res::${SessionSocketEvents[next]}`,
      },
    };
  },
  {
    responses: {} as { [k in keyof typeof SessionSocketEvents]: string },
    requests: {} as { [k in keyof typeof SessionSocketEvents]: string },
  }
);

// TODO: Might be better to pass in the variable instead of the string
//  as this will add more bytes to the sdk size
// export const sessionSocketRequest = (event: keyof typeof SessionSocketEvents) =>
//   `req::${event}`;
// export const sessionSocketResponse = (
//   event: keyof typeof SessionSocketEvents
// ) => `res::${event}`;
