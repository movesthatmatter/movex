import { Pubsy } from 'ts-pubsy';
import { isFunction } from './misc';

export type NextStateGetter<T> = T | ((prev: T) => T);

export const getNextStateFrom = <T>(prev: T, a: NextStateGetter<T>) => {
  return isFunction(a) ? a(prev) : a;
};

export interface IObservable<T> {
  get: () => T;
  onUpdated: (fn: (state: T) => void) => () => void;
  update: (getNextState: T | ((prev: T) => T)) => void;
}

export class Observable<T> {
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
    this._state = getNextStateFrom(this._state, nextStateGetter);

    // TODO: Should it only call onUpdate when there actually is an update??
    //  Or should I leave that to the implementation
    this.pubsy.publish('onUpdate', this._state);

    return this;
  }

  // TODO: Add map for transformation
  map<T1>(mapFn: (state: T) => T1) {
    // Is this good enough? Or is it creating some weird issues?
    const $next = new Observable(mapFn(this.get()));

    // Hook up the update
    $next.onUpdate = (updateFn: (state: T1) => void) => {
      return this.onUpdate((t) => updateFn(mapFn(t)));
    };

    return $next;
  }
}
