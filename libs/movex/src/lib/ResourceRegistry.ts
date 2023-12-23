// import { BaseMovexDefinitionResourcesMap } from 'movex-core-util';

// export class ResourceObservablesRegistry<
//   TResourcesMap extends BaseMovexDefinitionResourcesMap
// > {
//   // private pubsy = new Pubsy<{
//   //   [rid in ResourceIdentifierStr<string>]: any;
//   // }>();

//   private resourceObservablesByRid: {
//     [rid in ResourceIdentifierStr<string>]: MovexResourceObservable;
//   } = {};

//   constructor(movex: MovexClient) {

//   }

//   get<TResourceType extends Extract<TResourcesMap, string>>(
//     rid: ResourceIdentifier<TResourceType>
//   ) {
//     return this.resourceObservablesByRid[toResourceIdentifierStr(rid)];
//   }

//   register<TResourceType extends Extract<TResourcesMap, string>>(
//     resource: MovexClient.MovexResource<any, any, any>,
//     rid: ResourceIdentifier<TResourceType>
//   ) {
//     const existent = this.get(rid);

//     if (existent) {
//       return existent;
//     }

//     const ridAsStr = toResourceIdentifierStr(rid);

//     // if (this.resourceObservablesByRid[ridAsStr]) {
//     //   return this.resourceObservablesByRid[ridAsStr];
//     // }

//     const $resource = resource.bind(rid);

//     this.resourceObservablesByRid[ridAsStr] = $resource;

//     return $resource;
//   }