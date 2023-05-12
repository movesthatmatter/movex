import { EventMap } from 'typed-emitter';

export type UnsubscribeFn = () => void;

export interface Emitter<TEventMap extends EventMap> {
  on<E extends keyof TEventMap>(
    event: E,
    listener: (
      p: Parameters<TEventMap[E]>[0],
      ack: (r: ReturnType<TEventMap[E]>) => void
    ) => void
  ): this;
  off<E extends keyof TEventMap>(
    event: E,
    listener: (
      p: Parameters<TEventMap[E]>[0],
      ack: (r: ReturnType<TEventMap[E]>) => void
    ) => void
  ): this;
  subscribe<E extends keyof TEventMap>(
    event: E,
    listener: (
      p: Parameters<TEventMap[E]>[0],
      ack: (r: ReturnType<TEventMap[E]>) => void
    ) => void
  ): UnsubscribeFn;
  emit<E extends keyof TEventMap>(
    event: E,
    request: Parameters<TEventMap[E]>[0],
    acknowledgeCb?: (response: ReturnType<TEventMap[E]>) => void
  ): boolean;
  emitAndAcknowledge<E extends keyof TEventMap>(
    event: E,
    request: Parameters<TEventMap[E]>[0]
  ): Promise<ReturnType<TEventMap[E]>>;
  // eventMap: TEventMap;
}

export interface EmitterEventMap extends EventMap {}

// type Events = {
//   y: (p: { n: number; o: string }) => number;
//   x: (p: string) => string;
// };

// declare const emitter: Emitter<Events>;

// emitter.emit('y', { n: 3, o: 's' });

// emitter.on('y', (e) => {
//   if (e.)
// })
