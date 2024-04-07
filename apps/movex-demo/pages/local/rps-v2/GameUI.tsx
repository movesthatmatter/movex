import React from "react";
import { MovexBoundResourceFromConfig } from "movex-react";
import { useCallback, useEffect, useMemo } from "react";
import { globalLogsy } from "movex-core-util";
import movexConfig from "./movex.config";
import {
  PlayerLabel,
  toOppositeLabel,
  RPS,
  selectAvailableLabels
} from "./movex";

type Props = {
  boundResource: MovexBoundResourceFromConfig<
    typeof movexConfig["resources"],
    "rps"
  >;
  userId: string;
  buttonClassName?: string;
  containerClassName?: string;
  backgroundColor?: string;
};

export const GameUI: React.FC<Props> = ({
  boundResource,
  userId,
  ...props
}) => {
  const { state, dispatch, dispatchPrivate } = boundResource;
  const { players } = state;

  const myPlayerLabel = useMemo((): PlayerLabel | undefined => {
    if (!(players.playerA && players.playerB)) {
      return undefined;
    }

    if (players.playerA.id === userId) {
      return "playerA";
    }

    if (players.playerB.id === userId) {
      return "playerB";
    }

    return undefined;
  }, [players, userId]);

  const oppnentPlayerLabel = useMemo(() => {
    return myPlayerLabel ? toOppositeLabel(myPlayerLabel) : undefined;
  }, [myPlayerLabel]);

  // Add Player
  useEffect(() => {
    // TODO: here there is a major issue, as selectAvailableLables works with local state
    //  but it needs to check on the actual (master) state. How to solve this?
    //  add an api to be able to read master state seperately?

    // Or in this case change the strategy altogether, and work with master generated values, in which case
    // the local optimistic state udate gets turned off by default, so that means it will wait for the real state to update.
    // Kinda like a dispatchAndWait
    const availableLabels = selectAvailableLabels(state);

    if (
      state.players.playerA?.id === userId ||
      state.players.playerB?.id === userId
    ) {
      return;
    }

    if (availableLabels.length === 0) {
      globalLogsy.warn("Player Slots taken");

      return;
    }

    dispatch({
      type: "addPlayer",
      payload: {
        id: userId,
        playerLabel: availableLabels[0],
        atTimestamp: new Date().getTime()
      }
    });
  }, [userId, state, dispatch]);

  const submit = useCallback(
    (play: RPS) => {
      if (!myPlayerLabel) {
        console.warn("Not A Player");
        return;
      }

      dispatchPrivate(
        {
          type: "submit",
          payload: {
            playerLabel: myPlayerLabel,
            rps: play
          },
          isPrivate: true
        },
        {
          type: "setReadySubmission",
          payload: {
            playerLabel: myPlayerLabel
          }
        }
      );
    },
    [dispatchPrivate, myPlayerLabel]
  );

  const winner = useMemo(() => {
    if (!state.winner) {
      return undefined;
    }

    if (state.winner === "1/2") {
      return "1/2";
    }

    const {
      submissions: { playerA }
    } = state;

    if (playerA.play === state.winner) {
      return state.players.playerA.label;
    }

    return state.players.playerB.label;
  }, [state.winner]);

  return (
    <div
      className="w-full flex h-full flex-col text-white"
      style={{
        ...(props.backgroundColor
          ? {
              background: props.backgroundColor
            }
          : {
              // background: "#afd8fa"
            })
      }}
    >
      <div className="flex flex-1 w-full h-full flex-col justify-center items-center content-center">
        <div className="p-10 pb-20 text-xl font-bold capitalize">{userId}</div>
        {state.winner ? (
          <>
            <h3 className="text-7xl text-center">
              {winner === "1/2"
                ? "Draw 😫"
                : winner === myPlayerLabel
                ? "You Won 🎉"
                : "You Lost 😢"}
            </h3>
            <button
              className="text-2xl font-bold mt-10 hover:text-3xl"
              onClick={() => dispatch({ type: "playAgain" })}
            >
              Play Again
            </button>
          </>
        ) : (
          <>
            <div className="flex">
              <div>
                <button
                  style={{
                    animationDelay: "200ms",
                    animationDuration: "3s"
                  }}
                  className={`animate-bounce text-7xl hover:bg-red-500 p-6 rounded-xl ${
                    myPlayerLabel &&
                    state.submissions[myPlayerLabel]?.play === "rock" &&
                    "bg-red-500"
                  }`}
                  onClick={() => submit("rock")}
                >
                  <span role="img" aria-label="rock">
                    👊
                  </span>
                </button>
              </div>
              <div>
                <button
                  style={{
                    animationDelay: "500ms",
                    animationDuration: "3s"
                  }}
                  className={`animate-bounce text-7xl hover:bg-red-500 p-6 rounded-xl ${
                    myPlayerLabel &&
                    state.submissions[myPlayerLabel]?.play === "paper" &&
                    "bg-red-500"
                  }`}
                  onClick={() => submit("paper")}
                >
                  <span role="img" aria-label="paper">
                    ✋
                  </span>
                </button>
              </div>
              <div>
                <button
                  style={{
                    animationDelay: "0ms",
                    animationDuration: "3s"
                  }}
                  className={`animate-bounce text-7xl hover:bg-red-500 p-6 rounded-xl ${
                    myPlayerLabel &&
                    state.submissions[myPlayerLabel]?.play === "scissors" &&
                    "bg-red-500"
                  }`}
                  onClick={() => submit("scissors")}
                >
                  <span role="img" aria-label="scrissors">
                    ✌️
                  </span>
                </button>
              </div>
            </div>
            <div className="text-center">
              {oppnentPlayerLabel &&
                state.submissions[oppnentPlayerLabel]?.play && (
                  <h5 className="text-lg italic">
                    Opponent Submitted{" "}
                    <span role="img" aria-label="time ticking">
                      ⌛️⏰
                    </span>
                  </h5>
                )}
            </div>
          </>
        )}
      </div>
      <div
        className="hidden md:block bg-red-100 bg-opacity-10 text-center pb-2 pt-2 pl-2 pr-2 overflow-scroll flex flex-col justify-center"
        style={{
          flex: 0.55
        }}
      >
        <div className="flex flex-col flex-1 nbg-green-100 h-full">
          <p className="font-bold pb-4 capitalize">{userId} Movex State</p>
          <pre
            className="text-xs text-left text-white flex flex-1 justify-center items-center nbg-red-100"
            lang="json"
          >
            <code>
              {JSON.stringify(
                {
                  submissions: state.submissions,
                  winner: state.winner
                },
                null,
                1
              )}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
};
