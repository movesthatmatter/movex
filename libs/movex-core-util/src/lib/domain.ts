import type {
  GenericClientResourceShapeOfType,
  ResourceIdentifier,
  ResourceIdentifierObj,
  ResourceIdentifierStr,
  WsResponseResultPayload,
} from './core-types';
import { isObject, keyInObject } from './misc';

export const toResourceIdentifierObj = <TResourceType extends string>(
  r: ResourceIdentifierObj<TResourceType> | ResourceIdentifierStr<TResourceType>
): ResourceIdentifierObj<TResourceType> => {
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

export const toResourceIdentifierStr = <TResourceType extends string>(
  r: ResourceIdentifierObj<TResourceType> | ResourceIdentifierStr<TResourceType>
): ResourceIdentifierStr<TResourceType> =>
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

// This was removed on Apirl 1st 2024, as I'm not sure it's used anywhere
// export const getResourceRid = <TResourceType extends string>(
//   r: GenericClientResourceShapeOfType<TResourceType>
// ) =>
//   toResourceIdentifierStr({
//     resourceType: r.type,
//     resourceId: r.id,
//   });

export const isResourceIdentifier = (
  s: unknown
): s is ResourceIdentifier<string> => {
  if (isObject(s)) {
    return (
      keyInObject(s, 'resourceType') &&
      keyInObject(s, 'resourceId') &&
      typeof s.resourceId === 'string' &&
      typeof s.resourceType === 'string' &&
      s.resourceId.length > 0 &&
      s.resourceType.length > 0
    );
  }

  if (typeof s === 'string') {
    return isResourceIdentifier(toResourceIdentifierObj(s as `s:s`));
  }

  return false;
};

export const isSameResourceIdentifier = <
  AType extends string,
  BType extends string
>(
  aRid: ResourceIdentifier<AType>,
  bRid: ResourceIdentifier<BType>
) => toResourceIdentifierStr(aRid) === toResourceIdentifierStr(bRid);

export const isResourceIdentifierOfType = <TType extends string>(
  t: TType,
  s: unknown
): s is ResourceIdentifier<TType> =>
  isResourceIdentifier(s) && toResourceIdentifierObj(s).resourceType === t;
