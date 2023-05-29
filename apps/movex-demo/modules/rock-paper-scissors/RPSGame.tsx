import movexConfig from 'apps/movex-demo/movex.config';
import { MovexBoundResourceFromConfig } from 'movex-react';
import { useCallback, useEffect, useMemo } from 'react';
import {
  PlayerLabel,
  RPS,
  selectAvailableLabels,
} from './rockPaperScissors.movex';

type Props = {
  boundResource: MovexBoundResourceFromConfig<
    typeof movexConfig['resources'],
    'rps'
  >;
  userId: string;
};

// const colors = ['yellow', 'orange', 'green', 'blue'] as const;

export const RPSGame: React.FC<Props> = ({ boundResource, userId }) => {
  const { state, dispatch, dispatchPrivate } = boundResource;

  const myPlayerLabel = useMemo((): PlayerLabel | undefined => {
    if (state.currentGame.players.playerA?.id === userId) {
      return 'playerA';
    }

    if (state.currentGame.players.playerB?.id === userId) {
      return 'playerB';
    }

    return undefined;
  }, [state, userId]);

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

  useEffect(() => {
    const availableLabels = selectAvailableLabels(state);

    if (
      state.currentGame.players.playerA?.id === userId ||
      state.currentGame.players.playerB?.id === userId
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

    return () => {
      // dispatch({
      //   type: 'removeParticipant',
      //   payload: {
      //     id: userId,
      //     atTimestamp: new Date().getTime(),
      //   },
      // });
    };
  }, [userId, state]);

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
      <br />
      <div>
        <pre>{JSON.stringify(state, null, 2)}</pre>
      </div>
    </div>
  );
};
