import { useEffect, useRef } from 'react';

const noop = () => {};

export const useInterval = (callback: () => void, delay?: number) => {
  const savedCallback = useRef(noop);

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== undefined) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }

    return () => undefined;
  }, [delay]);
};
