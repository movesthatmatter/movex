import {
  ResourceIdentifier,
  toResourceIdentifierStr,
  invoke,
  ResourceIdentifierStr,
} from 'movex-core-util';
import { AnyAction } from '../tools/action';
import { MovexReducer } from '../tools/reducer';
import { MovexClientResource } from './MovexClientResource';
import { ConnectionToMasterResource } from './ConnectionToMasterResource';
import { UnsubscribeFn } from '../core-types';
import { IOConnection } from '../io-connection/io-connection';
import { ConnectionToMaster } from './ConnectionToMaster';

export type MovexConfig = {
  url: string;
  clientId?: string; // Pass in a userId or allow the SDK to generate a random one
  apiKey: string;
  logger?: typeof console;
  waitForResponseMs?: number;
};

export class Movex {
  // private logger: typeof console;

  constructor(
    private connectionToMaster: IOConnection<any, AnyAction, string>
  ) {
    // private masterResourcesByType: ReducersMap // private config: MovexConfig, // private socketInstance: Socket,
    // this.logger = config.logger || console;
  }

  register<S, A extends AnyAction, TResourceType extends string>(
    resourceType: TResourceType,
    reducer: MovexReducer<S, A>
  ) {
    const masterResourceConnection = new ConnectionToMasterResource<
      S,
      A,
      TResourceType
    >(
      resourceType,
      // This is recasted to get it specific to the Resourceype
      this.connectionToMaster as unknown as ConnectionToMaster<
        S,
        A,
        TResourceType
      >
    );

    const unsubscribersByRid: Record<
      ResourceIdentifierStr<string>,
      UnsubscribeFn[]
    > = {};

    return {
      create: (state: S) => {
        return masterResourceConnection
          .create(resourceType, state)
          .map((r) => ({
            ...r,
            rid: toResourceIdentifierStr({ resourceId: r.id, resourceType }),
          }));
      },
      /**
       * This returns the actual MovexClientResource. The name "use" doesn't seem to be perfect yet
       *  but not sure what to use yet. "observe", "listenTo", "attach", "follow" ?:)
       *
       * @param rid
       * @returns
       */
      use: (rid: ResourceIdentifier<typeof resourceType>) => {
        const clientResource = new MovexClientResource(reducer);

        masterResourceConnection.get(rid).map((s) => {
          clientResource.sync(s);
        });

        unsubscribersByRid[toResourceIdentifierStr(rid)] = [
          clientResource.onDispatched((p) => {
            masterResourceConnection.emitAction(rid, p.action);
          }),
          masterResourceConnection.onFwdAction(rid, (p) => {
            clientResource.reconciliateAction(p);
          }),
          masterResourceConnection.onReconciliatoryActions(rid, (p) => {
            // p.actions.map(())
            // TODO: What should the reconciliatry actions do? Apply them all together and check at the end right?
            // If the end result don't match the checkusm this is the place where it can reask the master for the new state!
            // This is where that amazing logic lives :D
          }),
          // Add the client resource destroy to the list of unsubscribers
          () => clientResource.destroy(),

          // Add the master Resource Destroy as well
          () => masterResourceConnection.destroy(),
        ];

        return clientResource;
      },

      // Call to unsubscribe
      disuse: (rid: ResourceIdentifier<typeof resourceType>) => {
        (unsubscribersByRid[toResourceIdentifierStr(rid)] || []).forEach(
          invoke
        );
      },
    };
  }
}
