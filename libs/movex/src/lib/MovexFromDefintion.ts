import { Movex } from './Movex';
import type {
  BaseMovexDefinitionResourcesMap,
  MovexDefinition,
  AnyAction,
  GetReducerAction,
  GetReducerState,
  StringKeys,
} from 'movex-core-util';
import { ConnectionToMaster } from './ConnectionToMaster';

export class MovexFromDefinition<
  TMovexDefinitionResources extends BaseMovexDefinitionResourcesMap
> {
  private movex: Movex;

  constructor(
    private movexDefinition: MovexDefinition<TMovexDefinitionResources>,
    public connectionToMaster: ConnectionToMaster<any, AnyAction, any, any>
  ) {
    this.movex = new Movex(connectionToMaster);
  }

  getClientId() {
    return this.movex.getClientId();
  }

  getClient() {
    return this.movex.getClient();
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
