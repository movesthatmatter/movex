import type {
  AnyAction,
  ToPrivateAction,
  ToPublicAction,
} from 'movex-core-util';
import type { MovexResourceObservable } from './MovexResourceObservable';

/**
 * This is the MovexResource running on the Client
 * It could be used extensively in the UI hence the need to "bind" the methods
 * so "this" stays correct
 */
export class MovexBoundResource<
  TState = any,
  TAction extends AnyAction = AnyAction
> {
  // TODO: Add the TResourceType so it the rid can be typed correctly
  public rid = this.observable.rid;

  constructor(private observable: MovexResourceObservable<TState, TAction>) {}

  dispatch = (action: ToPublicAction<TAction>) => {
    this.observable.dispatch(action);
  };

  dispatchPrivate = (
    privateAction: ToPrivateAction<TAction>,
    publicAction: ToPublicAction<TAction>
  ) => {
    this.observable.dispatchPrivate(privateAction, publicAction);
  };

  get state() {
    return this.observable.getUncheckedState();
  }

  get subscribers() {
    return this.observable.get().subscribers;
  }

  // This is not needed i believe, but I need to check, as it goes all the way to the client with private checked state types
  // get item() {
  //   return this.observable.get();
  // }

  // This to be called when not used anymore in order to clean the update subscriptions
  destroy = () => {
    this.observable.destroy();
  };
}
