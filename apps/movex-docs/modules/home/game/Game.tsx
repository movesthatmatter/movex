import { useMemo } from 'react';

const bkgColor = '#ffc300';

export const Game = () => {
  const gameId = useMemo(() => String(Math.random()).slice(-8), []);

  return (
    <div
      className={`h-full flex w-full`}
      style={
        {
          // backgroundColor: bkgColor,
        }
      }
    >
      <div
        className={`flex w-full`}
        style={{
          flexDirection: 'column',
          background: `linear-gradient(0deg, #ffc300 0%, #ffc300 60%, #ffd60a 140%)`,
        }}
      >
        <div
          className="mx-auto max-w-[90rem] gap-2 pl-[max(env(safe-area-inset-left),1.5rem)] pr-[max(env(safe-area-inset-right),1.5rem)] pt-20 p-16"
          style={
            {
              // background: 'green',
            }
          }
        >
          <h1 className="text-6xl text-black font-bold">
            Try Movex with a Game of
            <span className="text-purple-5000">
              <span className="text-reds-500"> Rock </span>
              <span className="text-green-5002">Paper </span>
              <span className="text-blue-5002">Scissors</span>
            </span>
          </h1>
        </div>

        <div
          style={{
            flex: 0.1,
          }}
        />
        <div
          className="w-full flex"
          style={{
            flex: 1,
            borderRadius: 0,
          }}
        >
          <iframe
            src={`http://localhost:4200/rps/${gameId}?user=a&backgroundColor=${encodeURIComponent(
              bkgColor
            )}`}
            className="w-full h-full"
          />
          <iframe
            src={`http://localhost:4200/rps/${gameId}?user=b&backgroundColor=${encodeURIComponent(
              bkgColor
            )}`}
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
};
