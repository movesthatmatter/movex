import type {
  AnyAction,
  MovexReducer,
  SanitizedMovexClient,
} from 'movex-core-util';
import { ConnectionToMaster } from './ConnectionToMaster';
import { MovexResource } from './MovexResource';

export type MovexConfig = {
  url: string;
  clientId?: string; // Pass in a userId or allow the SDK to generate a random one
  apiKey: string;
  logger?: typeof console;
  waitForResponseMs?: number;
};

// @deprecate in favor of MovexFromDEfinition to clear up redundant code
export class Movex {
  constructor(
    private connectionToMaster: ConnectionToMaster<any, AnyAction, any, any>
  ) {}

  getClientId() {
    return this.getClient().id;
  }

  getClient(): SanitizedMovexClient {
    return this.connectionToMaster.client;
  }

  register<S, A extends AnyAction, TResourceType extends string>(
    resourceType: TResourceType,
    reducer: MovexReducer<S, A>
  ) {
    return new MovexResource( // This is recasted to make it specific to the ResourceType
      this.connectionToMaster as ConnectionToMaster<
        S,
        A,
        TResourceType,
        any // TODO: Fix this here or above?
      >,
      resourceType,
      reducer
    );
  }
}
