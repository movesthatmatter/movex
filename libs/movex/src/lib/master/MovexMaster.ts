import { objectKeys, toResourceIdentifierObj } from 'movex-core-util';
import { AsyncOk, AsyncResult } from 'ts-async-results';
import { MovexIOClientConnection } from '../movexIO/movexIO-client-connection';
import { MovexMasterResource } from './MovexMasterResource';

/**
 * This lives on the server most likely, and it's where the
 * fwd and the reconciliatory action logic reside
 *
 * This is also very generic with an API to just work when run
 */
export class MovexMaster {
  // needs a store (redis, api, etc)
  // needs a way to send messages to the clients
  //  so a connection. when an incoming message comes, process it and send further
  //  but of course without knowing it's socket or local, just async so it can be tested

  constructor(
    private masterResourcesByType: Record<string, MovexMasterResource<any, any>>
  ) {}

  // This needs to respond back to the client
  // it receives emitActions and responds with Ack, fwd or reconcilitary
  addClientConnection(io: MovexIOClientConnection) {
    const offMessage = io.onMessage((msg, acknowledge) => {
      if (msg.kind === 'emitAction') {
        const { action, rid } = msg.payload;

        const masterResource =
          this.masterResourcesByType[toResourceIdentifierObj(rid).resourceType];

        if (!masterResource) {
          return acknowledge('MasterResourceInexistent'); // Type this better
        }

        masterResource
          .applyAction(rid, io.clientId, action)
          .flatMap((applied) =>
            AsyncResult.all(
              new AsyncOk(applied),
              masterResource.getSubscribers(rid)
            )
          )
          .map(
            ([
              { nextPublic, nextPrivate, reconciliatoryActionsByClientId },
              subscribers,
            ]) => {
              // Notify the rest of the Client Subscribers of the actions
              objectKeys(subscribers).forEach((clientId) => {
                if (reconciliatoryActionsByClientId) {
                  io.send({
                    kind: 'reconciliatoryActions',
                    payload: {
                      rid,
                      actions: reconciliatoryActionsByClientId[clientId],
                    },
                  });
                } else {
                  io.send({
                    kind: 'fwdAction',
                    payload: {
                      rid,
                      action: nextPublic,
                    },
                  });
                }
              });

              // Send the Acknowledgement
              const ack = nextPrivate
                ? nextPrivate.checksum
                : nextPublic.checksum;

              return acknowledge(ack);
            }
          );
      }
    });

    return [offMessage];
  }
}

// const impl = () => {
//   // this runs on server
//   const localStore = new LocalMovexStore<
//     GetReducerState<typeof counterReducer>
//   >();
//   const localGameStore = new LocalMovexStore<
//     GetReducerState<typeof gameReducer>
//   >();

//   const movex = new MovexMaster({
//     // Here the store could actually be the same no? if it can be generic, and since on the server
//     //  it will be an abstraction of redis, or even matterio api, I believe it could just be the same store with some casting or
//     //  most likely knwoing how to get jsut the needed resource
//     counter: new MovexMasterResource(counterReducer, localStore),
//     game: new MovexMasterResource(gameReducer, localGameStore),
//   });
//   // private store: MovexStore<TState>
// };
