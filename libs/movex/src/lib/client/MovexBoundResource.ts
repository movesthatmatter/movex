import { invoke } from 'movex-core-util';
import { AnyAction, ToPrivateAction, ToPublicAction } from '../tools/action';
import { UnsubscribeFn } from '../core-types';
import { MovexResourceObservable } from './MovexResourceObservable';

/**
 * This is the MovexResource running on the Client
 */
export class MovexBoundResource<
  TState = any,
  TAction extends AnyAction = AnyAction
> {
  // private dispatcher: (
  //   actionOrActionTuple: ActionOrActionTupleFromAction<TAction>
  // ) => void;

  private unsubscribers: UnsubscribeFn[] = [];

  constructor(private observable: MovexResourceObservable<TState, TAction>) {}

  dispatch(action: ToPublicAction<TAction>) {
    console.trace('dispatch', this);
    this.observable.dispatch(action);
  }

  dispatchPrivate(
    privateAction: ToPrivateAction<TAction>,
    publicAction: ToPublicAction<TAction>
  ) {
    this.observable.dispatchPrivate(privateAction, publicAction);
  }

  get state() {
    return this.getState();
  }

  getState() {
    return this.observable.getUncheckedState();
  }

  // This to be called when destroying not used anymore in order to clean the update subscriptions
  destroy() {
    this.unsubscribers.forEach(invoke);
  }
}
