import { Movex } from './Movex';
import type {
  BaseMovexDefinitionResourcesMap,
  MovexDefinition,
  AnyAction,
  GetReducerAction,
  GetReducerState,
  StringKeys,
  IOConnection,
} from 'movex-core-util';

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
