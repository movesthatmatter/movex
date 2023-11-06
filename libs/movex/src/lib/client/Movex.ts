import type {
  AnyAction,
  ConnectionToMaster,
  MovexReducer,
  IOConnection,
} from  'movex-core-util';
import { MovexResource } from './MovexResource';

export type MovexConfig = {
  url: string;
  clientId?: string; // Pass in a userId or allow the SDK to generate a random one
  apiKey: string;
  logger?: typeof console;
  waitForResponseMs?: number;
};

export class Movex {
  constructor(private connectionToMaster: IOConnection<any, AnyAction, any>) {}

  getClientId() {
    return this.connectionToMaster.clientId;
  }

  register<S, A extends AnyAction, TResourceType extends string>(
    resourceType: TResourceType,
    reducer: MovexReducer<S, A>
  ) {
    return new MovexResource( // This is recasted to make it specific to the ResourceType
      this.connectionToMaster as unknown as ConnectionToMaster<
        S,
        A,
        TResourceType
      >,
      resourceType,
      reducer
    );
  }
}
