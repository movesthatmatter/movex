import { Emitter } from 'movex-core-util';
import { Pubsy } from 'ts-pubsy';
import { IOEvents } from '../../lib/io-connection/io-events';
import { AnyAction } from '../../lib/tools/action';
import { getUuid } from '../../lib/util';
import { UnsubscribeFn } from '../../lib/core-types';

export class MockConnectionEmitter<
  TState extends any = any,
  TAction extends AnyAction = AnyAction,
  TResourceType extends string = string
> implements Emitter<IOEvents<TState, TAction, TResourceType>>
{
  private mainPubsy = new Pubsy<{
    [E in keyof IOEvents<TState, TAction, TResourceType>]: {
      content: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0];
      // ackId?: string;
      ackCb?: (
        response: ReturnType<
          IOEvents<TState, TAction, TResourceType>[keyof IOEvents]
        >
      ) => void;
    };
  }>();

  private ackPubsy = new Pubsy<{
    // [E in keyof IOEvents]: ReturnType<
    //   IOEvents<TState, TAction, TResourceType>[E]
    // >;
    [ackId in string]: undefined;
  }>();

  private onEmittedPubsy = new Pubsy<{
    onEmitted: {
      event: keyof IOEvents;
      payload: Parameters<
        IOEvents<TState, TAction, TResourceType>[keyof IOEvents]
      >[0];
      // ackId?: string;

      ackCb?: (
        response: ReturnType<
          IOEvents<TState, TAction, TResourceType>[keyof IOEvents]
        >
      ) => void;

      // TODO: Is this needed here?
      // ackId?: string;
      // ackCb?: (
      //   response: ReturnType<
      //     IOEvents<TState, TAction, TResourceType>[keyof IOEvents]
      //   >
      // ) => void;
    };
  }>();
  // private localEventsPubsy = new Pubsy<{
  //   [-${E in keyof IOEvents}`]: {

  //   }
  // }>

  constructor(
    // private masterResource: MovexMasterResource<TState, TAction>,
    private clientId: string // private mocker?: Mocker, // private masterServer: MovexMasterServer,
  ) {}

  on<E extends keyof IOEvents<TState, TAction, TResourceType>>(
    event: E,
    // listener: IOEvents<TState, TAction, TResourceType>[E]
    listener: (
      p: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0],
      onAck: (
        res: ReturnType<IOEvents<TState, TAction, TResourceType>[E]>
      ) => void
    ) => void
  ) {
    this.mainPubsy.subscribe(event, (req) => {
      // console.log('[MockEmitter] subscribe called for:', event, req);
      // TODO: Add ability to unsubscribe
      listener(req.content, (res) => {
        if (req.ackCb) {
          // console.log(
          //   '[MockEmitter] subscribe ack gets called',
          //   event,
          //   req,
          //   res
          // );
          // console.log('[MockEmitter] ack Pubsy', this.ackPubsy);
          req.ackCb(res);
          // this.ackPubsy.publish(req.ackId, res as any);
        }
      });
    });

    return this;
  }

  // This is just an easier way to "on" that returns an ubsubscriber
  // For an easier API when needed (especially in tests)
  subscribe<E extends keyof IOEvents<TState, TAction, TResourceType>>(
    event: E,
    // listener: IOEvents<TState, TAction, TResourceType>[E]
    listener: (
      p: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0],
      onAck: (
        res: ReturnType<IOEvents<TState, TAction, TResourceType>[E]>
      ) => void
    ) => void
  ): UnsubscribeFn {
    this.on(event, listener);

    return () => {
      this.off(event, listener);
    };
  }

  off<E extends keyof IOEvents<TState, TAction, TResourceType>>(
    event: E,
    listener: (
      p: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0],
      ack: (r: ReturnType<IOEvents<TState, TAction, TResourceType>[E]>) => void
    ) => void
  ) {
    return this;
  }

  // This is a function existent only on the Mocker
  _onEmitted<E extends keyof IOEvents>(
    fn: (
      p: {
        event: E;
        payload: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0];
        // ackId?: string;
      },
      ackCb?: (
        response: ReturnType<IOEvents<TState, TAction, TResourceType>[E]>
      ) => void
    ) => void
  ) {
    return this.onEmittedPubsy.subscribe('onEmitted', (r) => {
      fn(
        {
          event: r.event as E,
          payload: r.payload as Parameters<
            IOEvents<TState, TAction, TResourceType>[E]
          >[0],
          // ackId: r.ackId,
        },
        r.ackCb
      );
    });
  }

  _publish<E extends keyof IOEvents>(
    event: E,
    payload: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0],

    // TODO: Is this needed here?
    // ackId?: string
    ackCb?: (
      response: ReturnType<IOEvents<TState, TAction, TResourceType>[E]>
    ) => void
  ) {
    this.mainPubsy.publish(event, {
      content: payload as any,
      ...(ackCb && {
        ackCb: (res) => {
          ackCb(res as any);
        },
      }),
      // ackId,
      // what ab the ack?
    });
  }

  emit<E extends keyof IOEvents<TState, TAction, TResourceType>>(
    event: E,
    request: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0],
    acknowledgeCb?: (
      response: ReturnType<IOEvents<TState, TAction, TResourceType>[E]>
    ) => void
  ) {
    // console.log(
    //   `[MockConnectionEmitter].emit("${event}")`,
    //   this.clientId,
    //   request
    // );

    if (acknowledgeCb) {
      // const payload: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0] = {
      //   : request as any,
      //   // ackId: getUuid(),
      // } as const;

      const ackId = getUuid();

      // TODO: Need a way for this to call the unsubscriber
      this.ackPubsy.subscribe(ackId, (ackMsg) => {
        acknowledgeCb(
          ackMsg as ReturnType<IOEvents<TState, TAction, TResourceType>[E]>
        );
      });

      // console.log('Ack Pubsy registered', this.ackPubsy);

      // console.trace('[MockConnectionEmitter].emit', this.clientId, event, request);

      // This cannot publish to itself as well?
      // console.log('yes with ack cb', ackId);

      // this.mainPubsy.publish(event, payload);
      this.onEmittedPubsy.publish('onEmitted', {
        event,
        payload: request,
        ackCb: acknowledgeCb as any,
        // ackCb: (r) => acknowledgeCb(r as any),
      });
    } else {
      // setTimeout(() => {
      // console.log('[MockConnectionEmitter].publishing', event, request);

      this.onEmittedPubsy.publish('onEmitted', {
        event,
        payload: request,
      });
      // this.mainPubsy.publish(event, {
      //   content: request as any,
      // });
      // }, 1000)
    }

    // if (event === 'createResource') {
    //   const req = request as Parameters<
    //     IOEvents<TState, TAction, TResourceType>['createResource']
    //   >[0];

    //   type ResponseType = ReturnType<
    //     IOEvents<TState, TAction, TResourceType>['createResource']
    //   >;

    //   // this.masterServer.

    //   // This shouldn't happen here, but it should make the call to the master server

    //   // this.masterResource
    //   //   .create(req.resourceType, req.resourceState)
    //   //   .map((masterResource) => {
    //   //     // const ridObj = toResourceIdentifierObj(masterResource.id);

    //   //     // I feel like this should be in another master place, but the state comes from there already actually, no?
    //   //     const masterToClientResource: GetIOPayloadOKTypeFrom<ResponseType> = {
    //   //       rid: masterResource.rid,
    //   //       state: masterResource.state,
    //   //     };

    //   //     return masterToClientResource;
    //   //   })
    //   //   .resolve()
    //   //   .then((r) => {
    //   //     const res = {
    //   //       ok: r.ok,
    //   //       err: r.err,
    //   //       val: r.val,
    //   //     } as ReturnType<IOEvents<TState, TAction, TResourceType>[E]>;

    //   //     acknowledgeCb?.(res);
    //   //   });
    // } else if (event === 'getResourceState') {
    //   const req = request as Parameters<
    //     IOEvents<TState, TAction, TResourceType>['getResourceState']
    //   >[0];

    //   type ResponseType = ReturnType<
    //     IOEvents<TState, TAction, TResourceType>['getResourceState']
    //   >;

    //   // this.masterResource
    //   //   .getState(req.rid, this.clientId)
    //   //   .resolve()
    //   //   .then((r) => {
    //   //     const res = {
    //   //       ok: r.ok,
    //   //       err: r.err,
    //   //       val: r.val,
    //   //     } as ReturnType<IOEvents<TState, TAction, TResourceType>[E]>;

    //   //     acknowledgeCb?.(res);
    //   //   });
    // } else if (event === 'emitActionDispatch') {
    //   const req = request as Parameters<
    //     IOEvents<TState, TAction, TResourceType>['emitActionDispatch']
    //   >[0];

    //   // this.emit(req.action)

    //   // this.masterResource
    //   //   .applyAction(req.rid, this.clientId, req.action)
    //   //   .resolve()
    //   //   .then((r) => {
    //   //     const res = {
    //   //       ok: r.ok,
    //   //       err: r.err,
    //   //       val: r.val,
    //   //     } as ReturnType<IOEvents<TState, TAction, TResourceType>[E]>;

    //   //     // if (r.ok) {
    //   //     //   console.log('Mock emitter ok. Going to emit fwdAction', r.val);
    //   //     //   this.emitAndAcknowledge('fwdAction', {
    //   //     //     rid: req.rid,
    //   //     //     ...r.val.nextPublic,
    //   //     //   }).then(() => {
    //   //     //     // Not sure if this should wait to ack
    //   //     //     acknowledgeCb?.(res);
    //   //     //   });
    //   //     // } else {
    //   //     acknowledgeCb?.(res);
    //   //     // }
    //   //   });
    // } else if (event === 'fwdAction') {
    //   console.log('mock on fwd actoin what to do??');
    //   // this.mas
    // }

    return true;
  }

  emitAndAcknowledge<E extends keyof IOEvents<TState, TAction, TResourceType>>(
    event: E,
    request: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0]
  ) {
    return new Promise<ReturnType<IOEvents<TState, TAction, TResourceType>[E]>>(
      (resolve) => {
        this.emit(event, request, resolve);
      }
    );
  }
}

// const localStore = new LocalMovexStore<
//   GetReducerState<typeof counterReducer>
// >();
// const masterResource = new MovexMasterResource(counterReducer, localStore);
// const mock = new MockMasterClientEmitter(masterResource);

// // Client
// mock.emit(
//   'getResourceState',
//   {
//     rid: '' as ResourceIdentifier<string>,
//   },
//   (res) => {
//     if (res.ok) {
//       // res.val[0].count
//     }
//     // res[0];
//   }
// );

// // server

// mock.on('getResourceState', async (msg, ack) => {
//   // get resource async
//   // new AsyncOk({} as MovexStoreItem<Get>).map((s) => {
//   //   ack(new Ok(s.state));
//   //   // ack(new Ok(s.state));
//   // });
// });

// // TODO Next: Came up with the concept of EventEmitter (local, mock, socket) which is the only piece that needs to be mocked for testing
