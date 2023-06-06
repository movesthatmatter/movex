import { AnyAction } from '../tools/action';
import { IOConnection } from '../io-connection/io-connection';
import { Movex } from './Movex';
import {
  BaseMovexDefinitionResourcesMap,
  MovexDefinition,
} from '../public-types';
import { StringKeys } from 'movex-core-util';

export class MovexFromDefintion<
  TResourcesMap extends BaseMovexDefinitionResourcesMap
> {
  private movex: Movex;

  constructor(
    private movexDefinition: MovexDefinition<TResourcesMap>,
    connectionToMaster: IOConnection<any, AnyAction, any>
  ) {
    this.movex = new Movex(connectionToMaster);
  }

  getClientId() {
    return this.movex.getClientId();
  }

  register<S, A extends AnyAction>(resourceType: StringKeys<TResourcesMap>) {
    return this.movex.register(
      resourceType,
      this.movexDefinition.resources[resourceType]
    );
  }
}
