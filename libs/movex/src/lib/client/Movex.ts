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

  constructor(private connectionToMaster: IOConnection<any, AnyAction, any>) {
    // private masterResourcesByType: ReducersMap // private config: MovexConfig, // private socketInstance: Socket,
    // this.logger = config.logger || console;
  }

  register<S, A extends AnyAction, TResourceType extends string>(
    resourceType: TResourceType,
    reducer: MovexReducer<S, A>
  ) {
    const connectionToMasterResource = new ConnectionToMasterResource<
      S,
      A,
      TResourceType
    >(
      resourceType,
      // This is recasted to make it specific to the ResourceType
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
        return connectionToMasterResource.create(resourceType, state);
      },
      /**
       * This returns the actual MovexClientResource. The name "use" doesn't seem to be perfect yet
       *  but not sure what to use yet. "observe", "listenTo", "attach", "follow" ?:)
       * I think "bind" works pretty well! :D
       *
       * @param rid
       * @returns
       */
      bind: (rid: ResourceIdentifier<typeof resourceType>) => {
        const clientResource = new MovexClientResource(reducer);

        // Done/TODO: Needs a way to add a resource subscriber
        connectionToMasterResource.addResourceSubscriber(rid).map(() => {
          // TODO: This could be optimized to be returned from the "addResourceSubscriber" directly
          connectionToMasterResource.get(rid).map((s) => {
            clientResource.sync(s);
          });
        });

        unsubscribersByRid[toResourceIdentifierStr(rid)] = [
          clientResource.onDispatched(({ action, next: nextCheckedState }) => {
            const [, nextChecksum] = nextCheckedState;

            // console.log(
            //   `[Movex].onDispatched("${this.connectionToMaster.clientId}")`,
            //   action,
            //   'next:',
            //   nextChecksum
            // );

            connectionToMasterResource
              .emitAction(rid, action)
              .map(async (masterChecksum) => {
                if (masterChecksum === nextChecksum) {
                  return;
                }

                // TODO: Here I need to check that the checksums are the same
                // If not the action needs to revert, or toask the connection to give me the next state

                console.log(
                  `[Movex].onDispatched("${this.connectionToMaster.clientId}")`,
                  action,
                  'checksums DID NOT match',
                  masterChecksum,
                  nextChecksum
                );

                // Should get the next master state
                // const actual = await connectionToMasterResource
                //   .get(rid)
                //   .resolveUnwrap();
              });
          }),
          connectionToMasterResource.onFwdAction(rid, (p) => {
            // console.log(
            //   '[Movex] onFwdAction to',
            //   this.connectionToMaster.clientId,
            //   rid,
            //   p
            // );
            clientResource.reconciliateAction(p);
          }),
          connectionToMasterResource.onReconciliatoryActions(rid, (p) => {
            console.log(
              '[Movex] onReconciliatoryActions',
              this.connectionToMaster.clientId,
              rid,
              p
            );

            p.actions.forEach((action) => {
              console.log('action:', this.connectionToMaster.clientId, action)
              clientResource.applyAction(action as any)
              // clientResource.reconciliateAction
            })

            // p.actions.map(())
            // TODO: What should the reconciliatry actions do? Apply them all together and check at the end right?
            // If the end result don't match the checkusm this is the place where it can reask the master for the new state!
            // This is where that amazing logic lives :D
          }),
          // Add the client resource destroy to the list of unsubscribers
          () => clientResource.destroy(),

          // Add the master Resource Destroy as well
          () => connectionToMasterResource.destroy(),
        ];

        return clientResource;
      },

      // Call to unsubscribe
      unbind: (rid: ResourceIdentifier<typeof resourceType>) => {
        (unsubscribersByRid[toResourceIdentifierStr(rid)] || []).forEach(
          invoke
        );
      },
    };
  }
}
