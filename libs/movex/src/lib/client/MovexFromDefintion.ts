import { AnyAction } from '../tools/action';
import { IOConnection } from '../io-connection/io-connection';
import { Movex } from './Movex';
import {
  BaseMovexDefinitionResourcesMap,
  MovexDefinition,
} from '../public-types';
import { StringKeys } from 'movex-core-util';

export class MovexFromDefintion<
  TMovexDefinitionResources extends BaseMovexDefinitionResourcesMap
> {
  private movex: Movex;

  constructor(
    private movexDefinition: MovexDefinition<TMovexDefinitionResources>,
    connectionToMaster: IOConnection<any, AnyAction, any>
  ) {
    this.movex = new Movex(connectionToMaster);
  }

  getClientId() {
    return this.movex.getClientId();
  }

  register(
    resourceType: StringKeys<
      MovexDefinition<TMovexDefinitionResources>['resources']
    >
  ) {
    return this.movex.register(
      resourceType,
      this.movexDefinition.resources[resourceType]
    );
  }
}
