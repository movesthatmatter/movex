import { invoke } from '../../../movex-core-util/src';
import { Movex } from '../lib';
import { ConnectionToMaster } from '../lib/client/ConnectionToMaster';
import { IOEvents } from '../lib/io-connection/io-events';
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
