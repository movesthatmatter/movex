import { useContext, useEffect, useMemo, useState } from 'react';
import { MovexContext } from './MovexContext';
import { BaseMovexDefinedResourcesMap, MovexConfig } from './types';
import { GetReducerAction, GetReducerState } from 'movex';
import { MovexResource } from 'libs/movex/src/lib/client/MovexResource';
import { MovexBoundResource } from 'libs/movex/src/lib/client/MovexBoundResource';
import {
  ResourceIdentifier,
  toResourceIdentifierObj,
  toResourceIdentifierStr,
} from 'movex-core-util';

export const useMovex = () => {
  return useContext(MovexContext);
};

export const useMovexClientId = () => useMovex().clientId;

export type MovexResourceFromConfig<
  TResourcesMap extends BaseMovexDefinedResourcesMap,
  TResourceType extends keyof TResourcesMap,
  Reducer extends MovexConfig<TResourcesMap>['resources'][TResourceType] = MovexConfig<TResourcesMap>['resources'][TResourceType]
> = MovexResource<GetReducerState<Reducer>, GetReducerAction<Reducer>, string>;

export type MovexBoundResourceFromConfig<
  TResourcesMap extends BaseMovexDefinedResourcesMap,
  TResourceType extends keyof TResourcesMap,
  Reducer extends MovexConfig<TResourcesMap>['resources'][TResourceType] = MovexConfig<TResourcesMap>['resources'][TResourceType]
> = MovexBoundResource<GetReducerState<Reducer>, GetReducerAction<Reducer>>;

export const useMovexResource = <
  TResourcesMap extends BaseMovexDefinedResourcesMap
>(
  movexConfig: MovexConfig<TResourcesMap>,
  resourceType: keyof TResourcesMap
) => {
  const m = useMovex();

  const [movexResource, setResource] =
    useState<MovexResourceFromConfig<TResourcesMap, typeof resourceType>>();

  useEffect(() => {
    if (m.connected) {
      const reducer = movexConfig.resources[resourceType]; // TODO: Why the any?

      setResource(m.movex.register(resourceType as string, reducer));
    }
  }, [m.connected]);

  return movexResource;
};

export const useMovexBoundResource = <
  TResourcesMap extends BaseMovexDefinedResourcesMap,
  TResourceType extends keyof TResourcesMap
>(
  movexConfig: MovexConfig<TResourcesMap>,
  rid: ResourceIdentifier<string> // TODO: This should take the TResourceTpe
) => {
  const resource = useMovexResource(
    movexConfig,
    toResourceIdentifierObj(rid).resourceType
  );

  const ridAsStr = useMemo(() => toResourceIdentifierStr(rid), [rid]);

  const [boundResource, setBoundResource] =
    useState<
      MovexBoundResourceFromConfig<
        typeof movexConfig['resources'],
        TResourceType
      >
    >();

  useEffect(() => {
    if (!resource) {
      return;
    }

    const givenBoundResource = resource.bind(ridAsStr);

    const unsubscribe = givenBoundResource.onUpdated((next) => {
      setBoundResource(
        (prev) =>
          ({
            ...prev,
            state: next[0],
          } as MovexBoundResourceFromConfig<
            typeof movexConfig['resources'],
            TResourceType
          >)
      );

      console.log('State Updated', next[0]);
    });

    // console.log('givenBoundResource', givenBoundResource.onUpdated);

    // TODO: Enters a loop here!
    setBoundResource({
      dispatch: givenBoundResource.dispatch.bind(givenBoundResource),
      dispatchPrivate:
        givenBoundResource.dispatchPrivate.bind(givenBoundResource),
      destroy: givenBoundResource.destroy.bind(givenBoundResource),
      getState: givenBoundResource.getUncheckedState.bind(givenBoundResource),
      state: givenBoundResource.getUncheckedState(),
    } as MovexBoundResourceFromConfig<typeof movexConfig['resources'], TResourceType>);

    return () => {
      unsubscribe();
    };
  }, [resource, ridAsStr]);

  return boundResource;
};
