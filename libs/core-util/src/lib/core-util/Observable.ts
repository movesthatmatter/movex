import { Pubsy } from 'ts-pubsy';

export class Observable<T> {
  private pubsy = new Pubsy<{
    onUpdate: T;
  }>();

  constructor(private _state: T) {}

  get state() {
    return this._state;
  }

  onUpdate(fn: (state: T) => void) {
    return this.pubsy.subscribe('onUpdate', fn);
  }

  update(getNextState: Partial<T> | ((prev: T) => T)) {
    // const if ()
    if (typeof getNextState === 'function') {
      this._state = getNextState(this._state);
    } else {
      this._state = {
        ...this._state,
        ...getNextState,
      };
    }

    this.pubsy.publish('onUpdate', this._state);
  }
}
