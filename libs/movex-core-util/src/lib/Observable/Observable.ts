import { Pubsy } from 'ts-pubsy';
import { isFunction } from '../misc';

export type NextStateGetter<T> = T | ((prev: T) => T);

export interface IObservable<T> {
  get: () => T;
  onUpdate: (fn: (state: T) => void) => () => void;
  update: (getNextState: T | ((prev: T) => T)) => void;
}

export class Observable<T> implements IObservable<T> {
  private pubsy = new Pubsy<{
    onUpdate: T;
  }>();

  constructor(private _state: T) {}

  get() {
    return this._state;
  }

  onUpdate(fn: (state: T) => void) {
    return this.pubsy.subscribe('onUpdate', fn);
  }

  update(nextStateGetter: NextStateGetter<T>) {
    this._state = Observable.getNextStateFrom(this._state, nextStateGetter);

    // TODO: Should it only call onUpdate when there actually is an update??
    //  Or should I leave that to the implementation
    this.pubsy.publish('onUpdate', this._state);

    return this;
  }

  /**
   * Ability to transform the state
   *
   * @param mapFn
   * @returns
   */
  map<T1>(mapFn: (state: T) => T1) {
    const $next = new Observable(mapFn(this.get()));

    this.onUpdate((nextRootState) => {
      $next.update(mapFn(nextRootState));
    });

    return $next;
  }

  static getNextStateFrom = <T>(prev: T, a: NextStateGetter<T>) =>
    isFunction(a) ? a(prev) : a;
}
