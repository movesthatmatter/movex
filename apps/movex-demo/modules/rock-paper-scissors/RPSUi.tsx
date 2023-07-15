import { MovexBoundResourceFromConfig } from 'movex-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Rps, movexConfig } from 'movex-examples';
import { invoke, logsy, toResourceIdentifierStr } from 'movex-core-util';
import { Code, CopyToClipboard, Pre } from 'nextra/components';

const { selectAvailableLabels, toOppositeLabel } = Rps;

type Props = {
  boundResource: MovexBoundResourceFromConfig<
    typeof movexConfig['resources'],
    'rps'
  >;
  userId: string;
  buttonClassName?: string;
  containerClassName?: string;
  backgroundColor?: string;
};

export const RPSUi: React.FC<Props> = ({ boundResource, userId, ...props }) => {
  const { state, dispatch, dispatchPrivate } = boundResource;

  const myPlayerLabel = useMemo((): Rps.PlayerLabel | undefined => {
    if (state.players.playerA?.id === userId) {
      return 'playerA';
    }

    if (state.players.playerB?.id === userId) {
      return 'playerB';
    }

    return undefined;
  }, [state.players, userId]);

  const oppnentPlayerLabel = useMemo(() => {
    return myPlayerLabel ? toOppositeLabel(myPlayerLabel) : undefined;
  }, [myPlayerLabel]);

  const [showState, setShowState] = useState(true);

  // Add Player
  useEffect(() => {
    // TODO: here there is a major issue, as selectAvailableLables works with local state
    //  but it needs to check on the actual (master) state. How to solve this?
    //  add an api to be able to read master state seperately?

    // Or in this case change the strategy altogether, and work with master generated values, in which case
    // the local optimistic state udate gets turned off by default, so that means it will wait for the real staet to update.
    // Kinda like a dispatchAndWait
    const availableLabels = selectAvailableLabels(state);

    if (
      state.players.playerA?.id === userId ||
      state.players.playerB?.id === userId
    ) {
      return;
    }

    if (availableLabels.length === 0) {
      logsy.warn('Player Slots taken');

      return;
    }

    dispatch({
      type: 'addPlayer',
      payload: {
        id: userId,
        playerLabel: availableLabels[0],
        atTimestamp: new Date().getTime(),
      },
    });
  }, [userId, state]);

  const submit = useCallback(
    (play: Rps.RPS) => {
      if (!myPlayerLabel) {
        console.warn('Not A Player');
        return;
      }

      dispatchPrivate(
        {
          type: 'submit',
          payload: {
            playerLabel: myPlayerLabel,
            rps: play,
          },
          isPrivate: true,
        },
        {
          type: 'setReadySubmission',
          payload: {
            playerLabel: myPlayerLabel,
          },
        }
      );
    },
    [dispatchPrivate, myPlayerLabel]
  );

  const winner = useMemo(() => {
    if (!state.winner) {
      return undefined;
    }

    if (state.winner === '1/2') {
      return '1/2';
    }

    const {
      submissions: { playerA },
    } = state;

    if (playerA.play === state.winner) {
      return state.players.playerA.label;
    }

    return state.players.playerB.label;
  }, [state.winner]);

  return (
    <div
      className="w-full flex h-screen"
      style={{
        flexDirection: 'column',
        ...(props.backgroundColor && {
          background: props.backgroundColor,
        }),
      }}
    >
      {state.winner ? (
        <div
          className="flex w-full h-full"
          style={{
            flexDirection: 'column',
            alignContent: 'center',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <h3 className="text-7xl text-center">
            {winner === '1/2'
              ? 'Draw 😫'
              : winner === myPlayerLabel
              ? 'You Won 🎉'
              : 'You Lost 😢'}
          </h3>
          <button
            className="text-2xl font-bold mt-10 hover:text-3xl"
            onClick={() => {
              dispatch({
                type: 'playAgain',
              });
            }}
          >
            Play Again
          </button>
        </div>
      ) : (
        <>
          <div
            className="flex w-full h-full"
            style={{
              justifyContent: 'center',
              alignContent: 'center',
              alignItems: 'center',
              flexDirection: 'column',
            }}
          >
            <div className="flex">
              <div>
                <button
                  style={{
                    animationDelay: '200ms',
                    animationDuration: '3s',
                  }}
                  className={`animate-bounce text-7xl hover:bg-red-500 p-6 rounded-xl ${
                    myPlayerLabel &&
                    state.submissions[myPlayerLabel]?.play === 'rock' &&
                    'bg-red-500'
                  }`}
                  onClick={() => submit('rock')}
                >
                  👊
                </button>
              </div>
              <div>
                <button
                  style={{
                    animationDelay: '500ms',
                    animationDuration: '3s',
                  }}
                  className={`animate-bounce text-7xl hover:bg-red-500 p-6 rounded-xl ${
                    myPlayerLabel &&
                    state.submissions[myPlayerLabel]?.play === 'paper' &&
                    'bg-red-500'
                  }`}
                  onClick={() => submit('paper')}
                >
                  ✋
                </button>
              </div>
              <div>
                <button
                  style={{
                    animationDelay: '0ms',
                    animationDuration: '3s',
                  }}
                  className={`animate-bounce text-7xl hover:bg-red-500 p-6 rounded-xl ${
                    myPlayerLabel &&
                    state.submissions[myPlayerLabel]?.play === 'scissors' &&
                    'bg-red-500'
                  }`}
                  onClick={() => submit('scissors')}
                >
                  ✌️
                </button>
              </div>
            </div>
            <div className="text-center">
              {oppnentPlayerLabel &&
                state.submissions[oppnentPlayerLabel]?.play && (
                  <h5 className="text-lg italic">Opponent Submitted ⌛️⏰</h5>
                )}
            </div>
          </div>
        </>
      )}
      {/* <br /> */}
      {/* <button
        className="w-full bg-slate-100 hover:bg-slate-200"
        onClick={() => {
          setShowState((prev) => !prev);
        }}
      >
        {showState ? 'Show State' : 'Hide State'}
      </button> */}
      {/* <div>asd</div> */}
      <div className="bg-slate-700 bg-opacity-25 text-center text-sm font-bold">{myPlayerLabel}</div>
      {showState && (
        <div className="bg-slate-500 bg-opacity-25 p-8 pl-2 pr-2 flex flex-1 justify-center">
          <div>
            <Pre
              className="text-sm bg-transparent text-black"
              lang="json"
            >
              <Code>
                {JSON.stringify(
                  {
                    submissions: state.submissions,
                    winner: state.winner,
                  },
                  null,
                  2
                )}
              </Code>
            </Pre>
            {/* <pre
              className="text-sm bg-transparent text-black"
              style={{
                borderRadius: 0,
              }}
            >
              {JSON.stringify(
                {
                  submissions: state.submissions,
                  winner: state.winner,
                },
                null,
                2
              )}
            </pre> */}
          </div>
        </div>
      )}
    </div>
  );
};
