import { useCallback, useEffect, useMemo, useState } from 'react';
import useEventListener from '@use-it/event-listener';
import { keyInObject, objectKeys } from '@movex/movex-core-util';
import { MovexBoundResourceFromConfig } from 'movex-react';
import { getColorFromStr } from './util';
import { DemoMovexDefinition } from '../../movex';



type Props = {
  boundChatResource: MovexBoundResourceFromConfig<
    DemoMovexDefinition['resources'],
    'chat'
  >;
  userId: string;
};

export const Main: React.FC<Props> = ({ boundChatResource, userId }) => {
  const { state, dispatch } = boundChatResource;
  const [msg, setMsg] = useState<string>();

  const history = useMemo(
    () => state.messages.slice(0).reverse(),
    [state.messages]
  );

  const submit = useCallback(() => {
    if (msg?.length && msg.length > 0) {
      dispatch({
        type: 'writeMessage',
        payload: {
          participantId: userId,
          msg,
          atTimestamp: new Date().getTime(),
        },
      });

      setMsg('');
    }
  }, [msg]);

  useEffect(() => {
    dispatch({
      type: 'addParticipant',
      payload: {
        id: userId,
        color: `#${getColorFromStr(userId)}`,
        atTimestamp: new Date().getTime(),
      },
    });

    return () => {
      dispatch({
        type: 'removeParticipant',
        payload: {
          id: userId,
          atTimestamp: new Date().getTime(),
        },
      });
    };
  }, [userId]);

  useEventListener('keydown', (event: object) => {
    if (!keyInObject(event, 'key')) {
      return;
    }

    if (event.key === 'Enter') {
      if (
        keyInObject(event, 'preventDefault') &&
        typeof event.preventDefault === 'function'
      ) {
        if (msg?.length && msg.length > 0) {
          submit();
        }
        event.preventDefault();
      }
    }
  });

  useEffect(() => {
    dispatch({
      type: 'setTyping',
      payload: {
        participantId: userId,
        isTyping: !!(msg && msg.length > 0),
      },
    });
  }, [msg, userId]);

  return (
    <div
      style={{
        display: 'flex',
        flex: 1,
        flexDirection: 'row',
      }}
    >
      <div
        style={{
          height: 600,
          width: 300,
        }}
      >
        <div
          style={{
            background: '#efefef',
            height: 'calc(100% - 60px + 1em)',
            width: '100%',
            marginBottom: '1em',
            display: 'flex',
            flexDirection: 'column-reverse',
            overflowY: 'scroll',
            scrollBehavior: 'smooth',
          }}
        >
          {history.map((msg, i) => (
            <div
              key={msg.at}
              style={{
                borderBottom: '1px solid #ccc',
                padding: '.5em',
              }}
            >
              <div>{msg.content}</div>

              <i
                style={{
                  fontSize: '.8em',
                }}
              >
                {state.participants[msg.participantId] ? (
                  <span
                    style={{
                      color: state.participants[msg.participantId].color,
                    }}
                  >
                    {state.participants[msg.participantId].id}
                  </span>
                ) : (
                  <>Unknown</>
                )}{' '}
                at {new Date(msg.at).toLocaleString()}
              </i>
            </div>
          ))}
        </div>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          style={{
            border: '1px solid #ddd',
            width: '100%',
            height: '60px',
          }}
        />
        <button disabled={!!(msg?.length && msg.length === 0)} onClick={submit}>
          Submit
        </button>
      </div>
      <div
        style={{
          padding: '1em',
          paddingTop: 0,
        }}
      >
        Participants
        <div>
          {objectKeys(state.participants)
            .filter((p) => state.participants[p].active)
            .sort(
              (a, b) =>
                state.participants[a].joinedAt - state.participants[b].joinedAt
            )
            .map((p) => {
              const participant = state.participants[p];

              return (
                <div
                  key={p}
                  style={{
                    borderLeft: `5px ${participant.color} solid`,
                    paddingLeft: '7px',
                    marginBottom: '5px',
                    color: participant.active ? '#000' : '#efefef',
                    fontWeight: participant.id === userId ? 'bolder' : 'normal',
                  }}
                >
                  {participant.id}{' '}
                  {participant.isTyping && (
                    <i
                      style={{
                        fontWeight: 'normal',
                        fontSize: '.7em',
                      }}
                    >
                      Is typing...
                    </i>
                  )}
                </div>
              );
            })}
        </div>
        <button
          onClick={() => {
            dispatch({
              type: 'removeParticipant',
              payload: {
                id: userId,
                atTimestamp: new Date().getTime(),
              },
            });
          }}
        >
          Remove Self
        </button>
        {/* <div>
          State
          <pre>{JSON.stringify(state, null, 2)}</pre>
        </div> */}
      </div>
    </div>
  );
};
