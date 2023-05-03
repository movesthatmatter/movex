import { Emitter, GetIOPayloadOKTypeFrom } from 'movex-core-util';
import { Pubsy } from 'ts-pubsy';
import { IOEvents } from '../../lib/io-connection/io-events';
import { MovexMasterResource, MovexMasterServer } from '../../lib/master';
import { AnyAction } from '../../lib/tools/action';
import { getUuid } from '../../lib/util';
import { UnsubscribeFn } from '../../lib/core-types';

// const X = () => {
//   const pubsy = Pubsy<''>;
// }

interface Mocker {}

export class MockConnectionEmitter<
  TState extends any = any,
  TAction extends AnyAction = AnyAction,
  TResourceType extends string = string
> implements Emitter<IOEvents<TState, TAction, TResourceType>>
{
  private mainPubsy = new Pubsy<{
    [E in keyof IOEvents<TState, TAction, TResourceType>]: {
      content: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0];
      ackId?: string;
    };
  }>();

  private ackPubsy = new Pubsy<{
    // [E in keyof IOEvents]: ReturnType<
    //   IOEvents<TState, TAction, TResourceType>[E]
    // >;
    [ackId in string]: undefined;
  }>();

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
      console.log(`[Mock] on('${event}')`, 'called');

      // TODO: Add ability to to unsubscribe

      listener(req.content, (res) => {
        console.log('[Mock] on ack listner', req);
        if (req.ackId) {
          this.ackPubsy.publish(req.ackId, res as any);
        }
        // What to do with the ack??
        // console.log('[Mock] in listener ack', res);
      });
    });

    // if (event === 'createResource') {

    //   // this.mainPubsy.subscribe('createResource', (req) => {
    //   //   listener(req, (res) => {
    //   //     this.masterResource.create(req.resourceType, req.resourceState);

    //   //     // this.ackPubsy.publish('')
    //   //     // this.emit('createResource')
    //   //   });
    //   // });
    // }

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

  emit<E extends keyof IOEvents<TState, TAction, TResourceType>>(
    event: E,
    request: Parameters<IOEvents<TState, TAction, TResourceType>[E]>[0],
    acknowledgeCb?: (
      response: ReturnType<IOEvents<TState, TAction, TResourceType>[E]>
    ) => void
  ) {
    console.log(`[Mock].emit("${event}")`, this.clientId, request);
    if (acknowledgeCb) {
      const payload = {
        content: request as any,
        ackId: getUuid(),
      } as const;

      // TODO: Need a way for this to call the unsubscriber
      this.ackPubsy.subscribe(payload.ackId, (ackMsg) => {
        acknowledgeCb(
          ackMsg as ReturnType<IOEvents<TState, TAction, TResourceType>[E]>
        );
      });

      this.mainPubsy.publish(event, payload);
    } else {
      this.mainPubsy.publish(event, {
        content: request as any,
      });
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
