import React, { useEffect, useState } from 'react';
import { useInterval } from './useInterval';

type Props = {
  msLeft?: number;
  onFinished: () => void;
};

export const SimpleCountdown: React.FC<Props> = ({
  msLeft = 10 * 1000,
  onFinished,
}) => {
  const [display, setDisplay] = useState(msLeft);

  useEffect(() => {
    setDisplay(msLeft);
  }, [msLeft]);

  useInterval(() => {
    setDisplay((prev) => {
      const next = prev - 10;

      if (next <= 0) {
        return 0;
      }

      return next;
    });
  }, 10);

  useEffect(() => {
    if (display === 0) {
      onFinished();
    }
  }, [display === 0]);

  return (
    <div className="">
      <span
        className="text-lg text-red-500 animate-pulse font-bold"
        style={{
          fontSize: 42,
        }}
      >
        {display}
      </span>
    </div>
  );
};
