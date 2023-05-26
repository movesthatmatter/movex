import { AnyAction } from '../tools/action';
import { MovexReducer } from '../tools/reducer';
import { IOConnection } from '../io-connection/io-connection';
import { ConnectionToMaster } from './ConnectionToMaster';
import { MovexResource } from './MovexResource';

export type MovexConfig = {
  url: string;
  clientId?: string; // Pass in a userId or allow the SDK to generate a random one
  apiKey: string;
  logger?: typeof console;
  waitForResponseMs?: number;
};

export class Movex {
  // private logger: typeof console;

  constructor(private connectionToMaster: IOConnection<any, AnyAction, any>) {
    // private masterResourcesByType: ReducersMap // private config: MovexConfig, // private socketInstance: Socket,
    // this.logger = config.logger || console;
  }

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
