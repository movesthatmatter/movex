import { MovexBoundResourceFromConfig } from 'movex-react';
import { useCallback, useEffect, useMemo } from 'react';
import { Rps, movexConfig } from 'movex-examples';
import { invoke, logsy, toResourceIdentifierStr } from 'movex-core-util';

const { selectAvailableLabels, toOppositeLabel } = Rps;

type Props = {
  boundResource: MovexBoundResourceFromConfig<
    typeof movexConfig['resources'],
    'rps'
  >;
  userId: string;
  buttonClassName?: string;
  containerClassName?: string;
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
    <div className="w-full">
      {state.winner ? (
        <div>
          <h3>
            {winner === '1/2'
              ? 'Draw'
              : winner === myPlayerLabel
              ? 'You Won'
              : 'You Lost'}
          </h3>
          <button
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
        <div className='flex align-stretch'>
          {oppnentPlayerLabel &&
            state.submissions[oppnentPlayerLabel]?.play && (
              <div>Opponent Submitted</div>
            )}
          <div >
          <button className="text-7xl hover:text-8xl" onClick={() => submit('rock')}>
            👊
          </button>
          </div>
          <button className="text-7xl hover:text-8xl" onClick={() => submit('paper')}>✋</button>
          <button className="text-7xl hover:text-8xl" onClick={() => submit('scissors')}>✌️</button>
        </div>
      )}
      {/* <br /> */}
      {/* <div>
        <pre>rid: {toResourceIdentifierStr(boundResource.rid)}</pre>
        <pre>{JSON.stringify(state, null, 2)}</pre>
      </div> */}
    </div>
  );
};
