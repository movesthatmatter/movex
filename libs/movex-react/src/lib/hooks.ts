import { useContext, useEffect, useMemo, useState } from 'react';
import {
  ResourceIdentifier,
  toResourceIdentifierObj,
  toResourceIdentifierStr,
} from 'movex-core-util';
import {
  Client,
  BaseMovexDefinitionResourcesMap,
  MovexDefinition,
  GetReducerAction,
  GetReducerState,
} from 'movex';
import { MovexContext } from './MovexContext';

export const useMovex = () => useContext(MovexContext);

export const useMovexClientId = () => useMovex().clientId;

export type MovexResourceFromConfig<
  TResourcesMap extends BaseMovexDefinitionResourcesMap,
  TResourceType extends keyof TResourcesMap,
  Reducer extends MovexDefinition<TResourcesMap>['resources'][TResourceType] = MovexDefinition<TResourcesMap>['resources'][TResourceType]
> = Client.MovexResource<
  GetReducerState<Reducer>,
  GetReducerAction<Reducer>,
  string
>;

export type MovexBoundResourceFromConfig<
  TResourcesMap extends BaseMovexDefinitionResourcesMap,
  TResourceType extends keyof TResourcesMap,
  Reducer extends MovexDefinition<TResourcesMap>['resources'][TResourceType] = MovexDefinition<TResourcesMap>['resources'][TResourceType]
> = Client.MovexBoundResource<
  GetReducerState<Reducer>,
  GetReducerAction<Reducer>
>;

export const useMovexResource = <
  TResourcesMap extends BaseMovexDefinitionResourcesMap
>(
  // movexDefinition: MovexDefinition<TResourcesMap>,
  resourceType: keyof TResourcesMap
) => {
  const m = useMovex();

  const [movexResource, setResource] =
    useState<MovexResourceFromConfig<TResourcesMap, typeof resourceType>>();

  useEffect(() => {
    if (m.connected) {
      // const reducer = movexDefinition.resources[resourceType]; // TODO: Why the any?

      setResource(m.movex.register(resourceType as string));
    }
  }, [m.connected]);

  return movexResource;
};

export const useMovexBoundResource = <
  TResourcesMap extends BaseMovexDefinitionResourcesMap,
  TResourceType extends Extract<keyof TResourcesMap, string>
>(
  movexConfig: MovexDefinition<TResourcesMap>,
  rid: ResourceIdentifier<TResourceType>
) => {
  const resource = useMovexResource(
    // movexConfig,
    // toResourceIdentifierObj(rid).resourceType
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

      // console.log('State Updated', next[0]);
    });

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
