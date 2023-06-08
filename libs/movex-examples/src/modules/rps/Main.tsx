import { MovexBoundResourceFromConfig } from 'movex-react';
import { useCallback, useEffect, useMemo } from 'react';
import {
  PlayerLabel,
  RPS,
  selectAvailableLabels,
  toOppositeLabel,
} from './movex';
import movexConfig from '../../movex.config';
import { toResourceIdentifierStr } from 'movex-core-util';

type Props = {
  boundResource: MovexBoundResourceFromConfig<
    typeof movexConfig['resources'],
    'rps'
  >;
  userId: string;
};

export const Main: React.FC<Props> = ({ boundResource, userId }) => {
  const { state, dispatch, dispatchPrivate } = boundResource;

  const myPlayerLabel = useMemo((): PlayerLabel | undefined => {
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
      console.warn('Player Slots taken');

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
    (play: RPS) => {
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

  return (
    <div
      style={
        {
          // display: 'flex',
          // flex: 1,
          // flexDirection: 'column',
        }
      }
    >
      <b>User: {userId}</b>
      {state.winner ? (
        <div>
          <h3>Winner is {state.winner}</h3>
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
        <div>
          {oppnentPlayerLabel &&
            state.submissions[oppnentPlayerLabel]?.play && (
              <div>Opponent Submitted</div>
            )}
          <button
            style={{
              margin: '1em',
            }}
            onClick={() => submit('rock')}
          >
            Rock
          </button>
          <button
            style={{
              margin: '1em',
            }}
            onClick={() => submit('paper')}
          >
            Paper
          </button>
          <button
            style={{
              margin: '1em',
            }}
            onClick={() => submit('scissors')}
          >
            Scissoers
          </button>
        </div>
      )}
      <br />
      <div>
        <pre>rid: {toResourceIdentifierStr(boundResource.rid)}</pre>
        <pre>{JSON.stringify(state, null, 2)}</pre>
      </div>
    </div>
  );
};
