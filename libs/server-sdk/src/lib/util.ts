import {
  ResourceIdentifier,
  ResourceIdentifierString,
  WsResponseResultPayload,
} from '.';

export const objectKeys = <O extends object>(o: O) =>
  Object.keys(o) as (keyof O)[];

export const toResourceIdentifier = <TResourceType extends string>(
  r: ResourceIdentifier<TResourceType> | ResourceIdentifierString<TResourceType>
): ResourceIdentifier<TResourceType> => {
  if (typeof r === 'string') {
    const resourceType = r.slice(0, r.indexOf(':')) as TResourceType;
    const resourceId = r.slice(r.indexOf(':') + 1);

    return {
      resourceType,
      resourceId,
    };
  }

  return r;
};

export const toResourceIdentifierString = <TResourceType extends string>(
  r: ResourceIdentifier<TResourceType> | ResourceIdentifierString<TResourceType>
): ResourceIdentifierString<TResourceType> =>
  typeof r === 'string' ? r : `${r.resourceType}:${r.resourceId}`;

export const toWsResponseResultPayloadOk = <T>(
  val: T
): WsResponseResultPayload<T, never> => ({
  ok: true,
  err: false,
  val,
});

export const toWsResponseResultPayloadErr = <E>(
  val: E
): WsResponseResultPayload<never, E> => ({
  ok: false,
  err: true,
  val,
});

// export enum StoreNativeKeys {
//   $clients = '$clients',
//   $matches = '$matches',
// }

export const $MATCHES_KEY: any = '$matches';
