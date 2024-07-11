import {
  type BaseMovexDefinitionResourcesMap,
  ResourceIdentifier,
  toResourceIdentifierStr,
  ResourceIdentifierStr,
  toResourceIdentifierObj,
  StringKeys,
} from 'movex-core-util';
import {
  MovexClient,
  MovexFromDefintion,
  MovexResourceObservable,
} from 'movex';

/**
 * This is where all of the resourceObservables are being kept by Rid
 */
export class ResourceObservablesRegistry<
  TResourcesMap extends BaseMovexDefinitionResourcesMap
> {
  private resourceObservablesByRid: {
    [rid in ResourceIdentifierStr<string>]: {
      _movexResource: MovexClient.MovexResource<any, any, any>;
      $resource: MovexResourceObservable;
    };
  } = {};

  constructor(private movex: MovexFromDefintion<TResourcesMap>) {}

  private get<TResourceType extends StringKeys<TResourcesMap>>(
    rid: ResourceIdentifier<TResourceType>
  ) {
    return this.resourceObservablesByRid[toResourceIdentifierStr(rid)];
  }

  register<TResourceType extends StringKeys<TResourcesMap>>(
    rid: ResourceIdentifier<TResourceType>
  ) {
    const existent = this.get(rid);

    if (existent) {
      return existent.$resource;
    }

    const ridAsStr = toResourceIdentifierStr(rid);
    const { resourceType } = toResourceIdentifierObj(rid);

    const movexResource = this.movex.register(resourceType);

    const $resource = movexResource.bind(rid);

    this.resourceObservablesByRid[ridAsStr] = {
      _movexResource: movexResource,
      $resource,
    };

    return $resource;
  }
}
