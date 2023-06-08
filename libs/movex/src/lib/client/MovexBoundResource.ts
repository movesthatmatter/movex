import { invoke } from 'movex-core-util';
import { AnyAction, ToPrivateAction, ToPublicAction } from '../tools/action';
import { UnsubscribeFn } from '../core-types';
import { MovexResourceObservable } from './MovexResourceObservable';

/**
 * This is the MovexResource running on the Client
 * It could be used extensively in the UI hence the need to "bind" the methods
 * so "this" statys correct
 */
export class MovexBoundResource<
  TState = any,
  TAction extends AnyAction = AnyAction
> {
  private unsubscribers: UnsubscribeFn[] = [];

  public rid = this.observable.rid;

  constructor(private observable: MovexResourceObservable<TState, TAction>) {}

  dispatch = (action: ToPublicAction<TAction>) => {
    console.log('[MovexBoundResource] dispatch', action.type);
    this.observable.dispatch(action);
  };

  dispatchPrivate = (
    privateAction: ToPrivateAction<TAction>,
    publicAction: ToPublicAction<TAction>
  ) => {
    this.observable.dispatchPrivate(privateAction, publicAction);
  };

  get state() {
    return this.getState();
  }

  private getState = () => {
    return this.observable.getUncheckedState();
  };

  // This to be called when destroying not used anymore in order to clean the update subscriptions
  destroy = () => {
    this.unsubscribers.forEach(invoke);
  };
}
