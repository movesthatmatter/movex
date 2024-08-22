import type { EventMap } from 'typed-emitter';
import type { EmptyFn } from './core-types';

export const emptyFn: EmptyFn = () => {};

export interface EventEmitter<TEventMap extends EventMap> {
  on<E extends keyof TEventMap>(
    event: E,
    listener: (
      p: Parameters<TEventMap[E]>[0],
      ack?: (r: ReturnType<TEventMap[E]>) => void
    ) => void
  ): this;
  off<E extends keyof TEventMap>(
    event: E,
    listener: (
      p: Parameters<TEventMap[E]>[0],
      ack?: (r: ReturnType<TEventMap[E]>) => void
    ) => void
  ): this;
  // subscribe<E extends keyof TEventMap>(
  //   event: E,
  //   listener: (
  //     p: Parameters<TEventMap[E]>[0],
  //     ack?: (r: ReturnType<TEventMap[E]>) => void
  //   ) => void
  // ): UnsubscribeFn;
  emit<E extends keyof TEventMap>(
    event: E,
    request: Parameters<TEventMap[E]>[0],
    acknowledgeCb?: (response: ReturnType<TEventMap[E]>) => void
  ): boolean;
  emitAndAcknowledge<E extends keyof TEventMap>(
    event: E,
    request: Parameters<TEventMap[E]>[0]
  ): Promise<ReturnType<TEventMap[E]>>;

  disconnect(): void;
}
