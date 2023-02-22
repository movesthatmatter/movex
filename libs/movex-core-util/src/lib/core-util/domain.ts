import {
  GenericClientResourceShapeOfType,
  ResourceIdentifierObj,
  ResourceIdentifierStr,
  WsResponseResultPayload,
} from '../core-types';

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

export const getResourceRId = <TResourceType extends string>(
  r: GenericClientResourceShapeOfType<TResourceType>
) =>
  toResourceIdentifierStr({
    resourceType: r.type,
    resourceId: r.id,
  });
