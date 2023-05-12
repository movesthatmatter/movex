import {
  MovexClient,
  ResourceIdentifier,
  invoke,
} from '../../../../movex-core-util/src';
import { Movex } from '../../lib';
import { ConnectionToMaster } from '../../lib/client/ConnectionToMaster';
import { IOEvents } from '../../lib/io-connection/io-events';
import { ConnectionToClient, MovexMasterServer } from '../../lib/master';
import { MovexMasterResource } from '../../lib/master/MovexMasterResource';
import { LocalMovexStore } from '../../lib/movex-store';
import { AnyAction } from '../../lib/tools/action';
import { MovexReducer } from '../../lib/tools/reducer';
import { MockConnectionEmitter } from './MockConnectionEmitter';

// export const mockMovex = <
//   TState extends any,
//   TAction extends AnyAction = AnyAction
// >(
//   clientId = 'test-client',
//   masterResource: MovexMasterResource<TState, TAction>
// ) => {
//   const mockEmitter = new MockConnectionEmitter(clientId);

//   const unsubscribers = [
//     // All of these are already heandled in the code by the ConnectionToMasterResource
//     // but they are repeated here in order ot make it work for now. It should soon be removed in favor of .orchestrate() bellow

//     mockEmitter.subscribe('createResource', (response, ack) => {
//       masterResource
//         .create(response.resourceType, response.resourceState)
//         .resolve()
//         .then((r) => {
//           const res: ReturnType<
//             IOEvents<TState, TAction, string>['createResource']
//           > = r.ok
//             ? {
//                 ok: r.ok,
//                 err: r.err,
//                 val: r.val,
//               }
//             : {
//                 ok: r.ok,
//                 err: r.err,
//                 val: r.val,
//               };

//           ack(res);
//         });
//     }),

//     mockEmitter.subscribe('getResourceState', (response, ack) => {
//       masterResource
//         .getState(response.rid, clientId)
//         .resolve()
//         .then((r) => {
//           const res: ReturnType<
//             IOEvents<TState, TAction, string>['getResourceState']
//           > =
//             r.ok === true
//               ? {
//                   ok: r.ok,
//                   err: r.err,
//                   val: r.val,
//                 }
//               : {
//                   ok: r.ok,
//                   err: r.err,
//                   val: r.val,
//                 };

//           ack(res);
//         });
//     }),

//     mockEmitter.subscribe('fwdAction', (response, ack) => {
//       console.log('[MockMovex].onFwdAction', response, ack);
//     }),

//     mockEmitter.subscribe('addResourceSubscriber', (req, ack) => {
//       masterResource
//         .addResourceSubscriber(req.rid, clientId)
//         .resolve()
//         .then((r) => {
//           const res: ReturnType<
//             IOEvents<TState, TAction, string>['addResourceSubscriber']
//           > =
//             r.ok === true
//               ? {
//                   ok: r.ok,
//                   err: r.err,
//                   val: undefined,
//                 }
//               : {
//                   ok: r.ok,
//                   err: r.err,
//                   val: r.val,
//                 };

//           ack(res);
//         });
//     }),

//     // mockEmitter.subscribe('emitActionDispatch', (response, ack) => {
//     //   console.log('[MockMovex].onEmitActionDispatch', response);

//     //   masterResource
//     //     .applyAction(
//     //       response.rid,
//     //       clientId,
//     //       response.action as ActionOrActionTupleFromAction<TAction>
//     //     )
//     //     .resolve()
//     //     .then((r) => {
//     //       const res: ReturnType<
//     //         IOEvents<TState, TAction, string>['emitActionDispatch']
//     //       > =
//     //         r.ok === true
//     //           ? {
//     //               ok: r.ok,
//     //               err: r.err,
//     //               val: r.val.nextPrivate?.checksum || ,
//     //             }
//     //           : {
//     //               ok: r.ok,
//     //               err: r.err,
//     //               val: r.val,
//     //             };

//     //       // console.log('r', )
//     //       console.log('[MockMovex].applied Action', r);
//     //     });
//     // }),
//   ];

//   return {
//     movex: new Movex(new ConnectionToMaster(clientId, mockEmitter)),
//     destroy: () => {
//       unsubscribers.forEach(invoke);
//     },
//   };
// };

export const movexClientMasterOrchestrator = <TResourceType extends string>() => {
  let unsubscribe = async () => {};

  const orchestrate = <
    S,
    A extends AnyAction,
    TResourceType extends string
  >({
    clientIds,
    reducer,
    resourceType,
    // initialState,
  }: {
    clientIds: string[];
    reducer: MovexReducer<S, A>;
    resourceType: TResourceType;
    // initialState: S;
  }) => {
    // master setup
    const masterStore = new LocalMovexStore<S>();

    // await masterStore.create(rid, initialState).resolveUnwrap();

    const masterResource = new MovexMasterResource(reducer, masterStore);
    const masterServer = new MovexMasterServer({
      [resourceType]: masterResource,
    });

    return clientIds.map((clientId) => {
      // Would this be the only one for both client and master or seperate?
      // I believe it should be the same in order for it to work between the 2 no?
      const emitterOnMaster = new MockConnectionEmitter<S, A, TResourceType>(
        // masterResource,
        clientId
      );

      const masterConnectionToClient = new ConnectionToClient<
        S,
        A,
        TResourceType
      >(clientId, emitterOnMaster);

      const removeClientConnectionFromMaster = masterServer.addClientConnection(
        masterConnectionToClient
      );

      const mockedMovex = orchestrateMovex(clientId, emitterOnMaster);

      // TODO: This could be done better, but since the unsibscriber is async need to work iwth an sync iterator
      //  for now this should do
      const oldUnsubscribe = unsubscribe;
      unsubscribe = async () => {
        await oldUnsubscribe();

        removeClientConnectionFromMaster();

        await masterStore.clearAll().resolveUnwrap();

        mockedMovex.destroy();
      };

      return mockedMovex.movex.register(resourceType, reducer);
    });
  };

  return {
    unsubscribe,
    orchestrate,
  };
};

export type MovexClientMasterOrchestrator =
  typeof movexClientMasterOrchestrator;

const orchestrateMovex = <
  TState extends any,
  TAction extends AnyAction = AnyAction,
  TResourceType extends string = string
>(
  clientId: MovexClient['id'],
  emitterOnMaster: MockConnectionEmitter<TState, TAction, TResourceType>
) => {
  const emitterOnClient = new MockConnectionEmitter<
    TState,
    TAction,
    TResourceType
  >(clientId);

  const unsubscribers = [
    emitterOnClient._onEmitted((r, ackCb) => {
      // console.log('[orch]', clientId ,'onEmitted to master', r.event)
      // Calling the master with the given event from the client in order to process it
      emitterOnMaster._publish(r.event, r.payload, ackCb);
    }),
    emitterOnMaster._onEmitted((r, ackCb) => {
      // console.log('[orch]', clientId ,'onReceived from master', r.event, r.payload)
      // Calling the client with the given event from the client in order to process it
      emitterOnClient._publish(r.event, r.payload, ackCb);
    }),
  ];

  return {
    movex: new Movex(new ConnectionToMaster(clientId, emitterOnClient)),
    emitter: emitterOnClient,
    destroy: () => {
      unsubscribers.forEach(invoke);
    },
  };
};
