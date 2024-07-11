import { Context, useContext, useEffect, useMemo, useState } from 'react';
import type {
  ResourceIdentifier,
  UnsubscribeFn,
  GetReducerAction,
  GetReducerState,
  BaseMovexDefinitionResourcesMap,
  MovexDefinition,
  SanitizedMovexClient,
} from 'movex-core-util';
import {
  isResourceIdentifier,
  toResourceIdentifierObj,
  toResourceIdentifierStr,
  MovexClient as MovexClientUser,
} from 'movex-core-util';
import { MovexClient } from 'movex';
import { MovexContext, MovexContextProps } from './MovexContext';

export const useMovex = <TResourcesMap extends BaseMovexDefinitionResourcesMap>(
  movexConfig: MovexDefinition<TResourcesMap>
) =>
  useContext(
    MovexContext as Context<MovexContextProps<typeof movexConfig['resources']>>
  );

export const useMovexClientId = <
  TResourcesMap extends BaseMovexDefinitionResourcesMap
>(
  movexConfig: MovexDefinition<TResourcesMap>
) => useMovex(movexConfig).clientId;

export const useMovexClient = <
  TResourcesMap extends BaseMovexDefinitionResourcesMap
>(
  movexConfig: MovexDefinition<TResourcesMap>
): SanitizedMovexClient | undefined => {
  const mc = useMovex(movexConfig);

  if (!mc.connected) {
    return undefined;
  }

  return {
    id: mc.clientId,
    info: mc.clientInfo,
  };
};

export type MovexResourceFromConfig<
  TResourcesMap extends BaseMovexDefinitionResourcesMap,
  TResourceType extends keyof TResourcesMap,
  Reducer extends MovexDefinition<TResourcesMap>['resources'][TResourceType] = MovexDefinition<TResourcesMap>['resources'][TResourceType]
> = MovexClient.MovexResource<
  GetReducerState<Reducer>,
  GetReducerAction<Reducer>,
  string
>;

export type MovexBoundResourceFromConfig<
  TResourcesMap extends BaseMovexDefinitionResourcesMap,
  TResourceType extends Extract<keyof TResourcesMap, string>,
  Reducer extends MovexDefinition<TResourcesMap>['resources'][TResourceType] = MovexDefinition<TResourcesMap>['resources'][TResourceType]
> = MovexClient.MovexBoundResource<
  GetReducerState<Reducer>,
  GetReducerAction<Reducer>
>;

export const useMovexResourceType = <
  TResourcesMap extends BaseMovexDefinitionResourcesMap,
  TResourceType extends Extract<keyof TResourcesMap, string>
>(
  movexConfig: MovexDefinition<TResourcesMap>,
  resourceType: TResourceType
) => {
  const m = useMovex(movexConfig);

  const [resource, setResource] =
    useState<MovexResourceFromConfig<TResourcesMap, TResourceType>>();

  useEffect(() => {
    if (m.connected) {
      setResource(m.movex.register(resourceType) as any);
    }
  }, [m.connected]);

  return resource;
};

const registerMovexResourceType = <
  TResourcesMap extends BaseMovexDefinitionResourcesMap,
  TResourceType extends Extract<keyof TResourcesMap, string>
>(
  movex: MovexClient.MovexFromDefintion<TResourcesMap>,
  resourceType: TResourceType
) => movex.register(resourceType);

export const useMovexBoundResourceFromRid = <
  TResourcesMap extends BaseMovexDefinitionResourcesMap,
  TResourceType extends Extract<keyof TResourcesMap, string>
>(
  movexDefinition: MovexDefinition<TResourcesMap>,
  rid: ResourceIdentifier<TResourceType>,
  handlers?: {
    onReady?: (p: {
      boundResource: MovexClient.MovexBoundResource<
        GetReducerState<TResourcesMap[TResourceType]>,
        GetReducerAction<TResourcesMap[TResourceType]>
      >;
      clientId: MovexClientUser['id'];
    }) => void;
  }
) => {
  const resource = useMovexResourceType(
    movexDefinition,
    toResourceIdentifierObj(rid).resourceType
  );
  const ridAsStr = useMemo(() => toResourceIdentifierStr(rid), [rid]);

  const [boundResource, setBoundResource] =
    useState<MovexBoundResourceFromConfig<TResourcesMap, TResourceType>>();

  const movexContext = useContext(MovexContext);

  // useEffect(() => {
  //   props.onChange(contextState);
  // }, [contextState.connected, contextState.clientId]);

  useEffect(() => {
    if (!resource) {
      return;
    }

    if (!movexContext.connected) {
      return;
    }

    const unsubscribe = movexContext.bindResource(rid, (boundResource) => {
      setBoundResource(boundResource);

      handlers?.onReady?.({ boundResource, clientId: movexContext.clientId });
    });

    return () => {
      unsubscribe();
    };
  }, [resource, ridAsStr, movexContext.connected]);

  return boundResource;
};

// export const bindResource = <
//   TMovexDefinition extends MovexDefinition,
//   TResourceType extends Extract<keyof TMovexDefinition['resources'], string>
// >(
//   resource: MovexClient.MovexResource<any, any, any>,
//   rid: ResourceIdentifier<TResourceType>,
//   onStateUpdate: (p: MovexClient.MovexBoundResource) => void
// ) => {
//   const $resource = resource.bind(toResourceIdentifierStr(rid));

//   // TODO: One thing that might not work is the get state accessor with this, but that doesn't get invoked somewhere else

//   onStateUpdate(new MovexClient.MovexBoundResource($resource));

//   const unsubscribe = $resource.onUpdate(() => {
//     onStateUpdate(new MovexClient.MovexBoundResource($resource));
//   });

//   return unsubscribe;
// };

export const createMovexResource = <
  TResourcesMap extends BaseMovexDefinitionResourcesMap,
  TResourceType extends Extract<keyof TResourcesMap, string>
>(
  movex: MovexClient.MovexFromDefintion<TResourcesMap>,
  res: {
    type: TResourceType;
    state: GetReducerState<TResourcesMap[TResourceType]>;
  }
) => registerMovexResourceType(movex, res.type).create(res.state);

export const useCreateMovexResourceOnDemand = <
  TResourcesMap extends BaseMovexDefinitionResourcesMap,
  TResourceType extends Extract<keyof TResourcesMap, string>
>(
  movexConfig: MovexDefinition<TResourcesMap>,
  resourceInit:
    | {
        type: TResourceType;
        state: GetReducerState<TResourcesMap[TResourceType]>;
      }
    | undefined,
  onCreated: (rid: ResourceIdentifier<TResourceType>) => void
) => {
  const m = useMovex(movexConfig);

  useEffect(() => {
    if (resourceInit && m.connected) {
      createMovexResource<TResourcesMap, TResourceType>(
        m.movex as MovexClient.MovexFromDefintion<TResourcesMap>,
        resourceInit
      ).map((s) => onCreated(s.rid as ResourceIdentifier<TResourceType>));
    }
  }, [m.connected, resourceInit?.type, resourceInit?.state]);
};

export const useMovexBindOrCreateAndBindOnDemand = <
  TResourcesMap extends BaseMovexDefinitionResourcesMap,
  TResourceType extends Extract<keyof TResourcesMap, string>
>(
  movexConfig: MovexDefinition<TResourcesMap>,
  resourceInitOrRid:
    | {
        type: TResourceType;
        state: GetReducerState<TResourcesMap[TResourceType]>;
      }
    | ResourceIdentifier<TResourceType>
    | undefined
) => {
  const m = useMovex(movexConfig);
  const [boundResource, setBoundResource] =
    useState<
      MovexClient.MovexBoundResource<
        GetReducerState<TResourcesMap[TResourceType]>,
        GetReducerAction<TResourcesMap[TResourceType]>
      >
    >();

  useEffect(() => {
    if (!m.connected) {
      return;
    }

    if (!resourceInitOrRid) {
      return;
    }

    let unsubscribers: UnsubscribeFn[] = [];

    const bind = (rid: ResourceIdentifier<TResourceType>) => {
      // const resource = registerMovexResourceType(
      //   m.movex,
      //   toResourceIdentifierObj(rid).resourceType
      // );

      return m.bindResource(rid, setBoundResource);
    };

    if (isResourceIdentifier(resourceInitOrRid)) {
      unsubscribers = [...unsubscribers, bind(resourceInitOrRid)];
    } else {
      createMovexResource<TResourcesMap, TResourceType>(
        m.movex as MovexClient.MovexFromDefintion<TResourcesMap>,
        resourceInitOrRid
      ).map(({ rid }) => {
        unsubscribers = [
          ...unsubscribers,
          bind(rid as ResourceIdentifier<TResourceType>),
        ];
      });
    }
  }, [m.connected, resourceInitOrRid]);

  return boundResource;
};
