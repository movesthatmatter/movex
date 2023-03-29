import { UnsubscribeFn } from './core-types';
import { ActionOrActionTupleFromAction, AnyAction } from './tools/action';
import { MovexIOMasterConnection } from './movexIO/movexIO-master-connection';
import { ResourceIdentifier } from 'movex-core-util';
import { MovexReducer } from './tools/reducer';

/**
 * This handles the connection with MovexMaster per Resource Type?
 */
export class MasterResourceConnection<
  TState extends any,
  TAction extends AnyAction
> {
  constructor(
    private masterConnection: MovexIOMasterConnection,
    reducer: MovexReducer<TState, TAction>
  ) {}

  private handleConnection(masterConnection: MovexIOMasterConnection) {
    const unsubscribers: UnsubscribeFn[] = [];

    // TODO: Type this with zod
    const $clientConnectHandler = (payload: { clientId: string }) => {
      // Resolve the socket promise now!
      // this.ioConnectionDelegate.resolve(this.io);
      // this.ioPubsy.publish('connect', payload);
    };

    // TODO: Type the EventName
    // socket.on('$clientConnected', $clientConnectHandler);
    // unsubscribers.push(() =>
    //   socket.off('$clientConnected', $clientConnectHandler)
    // );

    return unsubscribers;
  }

  get(rid: ResourceIdentifier<string>) {
    return this.masterConnection.getResourceState<TState>(
      rid,
      this.masterConnection.clientId
    );
  }

  emitAction(
    rid: ResourceIdentifier<string>,
    actionOrActionTuple: ActionOrActionTupleFromAction<TAction>
  ) {
    return this.masterConnection.send({
      kind: 'emitAction',
      payload: {
        rid,
        action: actionOrActionTuple,
      },
    });
  }

  // onFwdAction = this.io.onFwdAction.bind(this.io);

  // onReconciliatoryActions = this.io.onReconciliatoryActions.bind(this.io);
}
