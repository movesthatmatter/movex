import { Emitter, MovexClient, invoke } from '../../../movex-core-util/src';
import { Movex } from '../lib';
import { ConnectionToMaster } from '../lib/client/ConnectionToMaster';
import { IOEvents } from '../lib/io-connection/io-events';
import { ConnectionToClient } from '../lib/master';
import { MovexMasterResource } from '../lib/master/MovexMasterResource';
import { ActionOrActionTupleFromAction, AnyAction } from '../lib/tools/action';
import { MockConnectionEmitter } from './util/MockConnectionEmitter';

export const mockMovex = <
  TState extends any,
  TAction extends AnyAction = AnyAction
>(
  clientId = 'test-client',
  masterResource: MovexMasterResource<TState, TAction>
) => {
  const mockEmitter = new MockConnectionEmitter(clientId);

  const unsubscribers = [
    // All of these are already heandled in the code by the ConnectionToMasterResource
    // but they are repeated here in order ot make it work for now. It should soon be removed in favor of .orchestrate() bellow

    mockEmitter.subscribe('createResource', (response, ack) => {
      masterResource
        .create(response.resourceType, response.resourceState)
        .resolve()
        .then((r) => {
          const res: ReturnType<
            IOEvents<TState, TAction, string>['createResource']
          > = r.ok
            ? {
                ok: r.ok,
                err: r.err,
                val: r.val,
              }
            : {
                ok: r.ok,
                err: r.err,
                val: r.val,
              };

          ack(res);
        });
    }),

    mockEmitter.subscribe('getResourceState', (response, ack) => {
      masterResource
        .getState(response.rid, clientId)
        .resolve()
        .then((r) => {
          const res: ReturnType<
            IOEvents<TState, TAction, string>['getResourceState']
          > =
            r.ok === true
              ? {
                  ok: r.ok,
                  err: r.err,
                  val: r.val,
                }
              : {
                  ok: r.ok,
                  err: r.err,
                  val: r.val,
                };

          ack(res);
        });
    }),

    mockEmitter.subscribe('fwdAction', (response, ack) => {
      console.log('[MockMovex].onFwdAction', response, ack);
    }),

    mockEmitter.subscribe('addResourceSubscriber', (req, ack) => {
      masterResource
        .addResourceSubscriber(req.rid, clientId)
        .resolve()
        .then((r) => {
          const res: ReturnType<
            IOEvents<TState, TAction, string>['addResourceSubscriber']
          > =
            r.ok === true
              ? {
                  ok: r.ok,
                  err: r.err,
                  val: undefined,
                }
              : {
                  ok: r.ok,
                  err: r.err,
                  val: r.val,
                };

          ack(res);
        });
    }),

    // mockEmitter.subscribe('emitActionDispatch', (response, ack) => {
    //   console.log('[MockMovex].onEmitActionDispatch', response);

    //   masterResource
    //     .applyAction(
    //       response.rid,
    //       clientId,
    //       response.action as ActionOrActionTupleFromAction<TAction>
    //     )
    //     .resolve()
    //     .then((r) => {
    //       const res: ReturnType<
    //         IOEvents<TState, TAction, string>['emitActionDispatch']
    //       > =
    //         r.ok === true
    //           ? {
    //               ok: r.ok,
    //               err: r.err,
    //               val: r.val.nextPrivate?.checksum || ,
    //             }
    //           : {
    //               ok: r.ok,
    //               err: r.err,
    //               val: r.val,
    //             };

    //       // console.log('r', )
    //       console.log('[MockMovex].applied Action', r);
    //     });
    // }),
  ];

  return {
    movex: new Movex(new ConnectionToMaster(clientId, mockEmitter)),
    destroy: () => {
      unsubscribers.forEach(invoke);
    },
  };
};

export const orchestrateMovex = <
  TState extends any,
  TAction extends AnyAction = AnyAction,
  TResourceType extends string = string
>(
  // masterConnectionToClient: ConnectionToClient<TState, TAction, TResourceType>,
  clientId: MovexClient['id'],
  emitterOnMaster: MockConnectionEmitter<TState, TAction, TResourceType>
  // emitter?: Emitter<IOEvents<TState, TAction, TResourceType>>
) => {
  const emitterOnClient = new MockConnectionEmitter<
    TState,
    TAction,
    TResourceType
  >(clientId);

  // const emitterOnMaster = masterConnectionToClient.emitter;

  const unsubscribers = [
    emitterOnClient._onEmitted(async (r, ackCb) => {
      
      // This attempted an emit to master, and now we are going to mock that by binding it to master manually
      // console.log('[orchestrate] emitterOnClient._onEmitted', r);

      // console.group('[orchestrate] Emitting to Master now');

      // Calling the master with the given event from the client in order to process it
      emitterOnMaster._publish(r.event, r.payload, ackCb);

      // r.ackCb()
      // const ack = await emitterOnMaster.emitAndAcknowledge(r.event, r.payload);
      // console.log('[orchestrate] received from master', ack);
      console.groupEnd();
    }),
    // emitterOnClient.subscribe('createResource', (req, ack) => {
    //   console.log('[orchestrate] emitterOnClient.onCreateResource', req);
    //   // This should probably just hook the client emitter with the master emitter? and vice versa
    //   // emitterOnMaster.emit('createResource', req as any, ack);
    // }),
    // emitterOnMaster.subscribe('createResource', (req, ack) => {
    //   console.log('[orchestrate] emitterOnMaster.onCreateResource', req);
    //   // emitterOnClient.emit('createResource', req as any, ack);
    // }),
    // emitterOnClient.subscribe('getResourceState', (req, ack) => {
    //   // masterConnectionToClient.emitter.emit(
    //   //   'getResourceState',
    //   //   req as any,
    //   //   ack
    //   // );
    // }),
    // emitterOnClient.subscribe('emitActionDispatch', (req, ack) => {
    //   // masterConnectionToClient.emitter.emit(
    //   //   'emitActionDispatch',
    //   //   req as any,
    //   //   ack
    //   // );
    // }),
    // emitterOnClient.subscribe('fwdAction', (req, ack) => {
    //   console.log('[test-utils].onFwdAction', req);

    //   // masterConnectionToClient.emitter.emit('fwdAction', req as any, ack);
    // }),
    // emitterOnClient.subscribe('addResourceSubscriber', (req, ack) => {
    //   // masterConnectionToClient.emitter.emit(
    //   //   'addResourceSubscriber',
    //   //   req as any,
    //   //   ack
    //   // );
    // }),
    // masterConnectionToClient.emitter
  ];

  return {
    movex: new Movex(new ConnectionToMaster(clientId, emitterOnClient)),
    emitter: emitterOnClient,
    destroy: () => {
      unsubscribers.forEach(invoke);
    },
  };
};
