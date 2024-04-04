import { MovexClient } from 'movex';
import {
  BaseMovexDefinitionResourcesMap,
  ResourceIdentifier,
  UnsubscribeFn,
} from 'movex-core-util';

export type ProvidedBindResource<
  TResourcesMap extends BaseMovexDefinitionResourcesMap
> = <TResourceType extends Extract<TResourcesMap, string>>(
  resourceType: TResourceType,
  rid: ResourceIdentifier<TResourceType>,
  onStateUpdate: (p: MovexClient.MovexBoundResource) => void
) => UnsubscribeFn;
