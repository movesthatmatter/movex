// import { Text } from 'apps/chessroulette-web/components/Text';
// import { useInterval } from 'apps/chessroulette-web/hooks/useInterval';
import React, { useEffect, useState } from 'react';
import prettyMs from 'pretty-ms';
import { useInterval } from './useInterval';

type Props = {
  msLeft?: number;
  onFinished: () => void;
};

// const toSeconds = (ms: number) => Math.floor(ms / 1000);
const toSeconds = (ms: number) => ms;

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
  }, [msLeft > 0 && display === 0]);

  return (
    <div className="">
      <span className="text-lg text-red-500 animate-pulse font-bold" style={{
        fontSize: 42
      }}>
        {display}
        {/* {prettyMs(toSeconds(display) * 1000, { colonNotation: true })} */}
      </span>
    </div>
  );
};
