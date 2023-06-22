import { AnyAction } from '../tools/action';
import { IOConnection } from '../io-connection/io-connection';
import { Movex } from './Movex';
import {
  BaseMovexDefinitionResourcesMap,
  MovexDefinition,
} from '../public-types';
import { StringKeys } from 'movex-core-util';
import { GetReducerAction, GetReducerState } from '../tools';

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

  register<TResourceType extends StringKeys<TMovexDefinitionResources>>(
    resourceType: TResourceType
  ) {
    const reducer = this.movexDefinition.resources[resourceType];
    type Reducer = typeof reducer;

    return this.movex.register<
      GetReducerState<Reducer>,
      GetReducerAction<Reducer>,
      TResourceType
    >(resourceType, reducer);
  }
}
