import movexConfig from 'apps/movex-demo/movex.config';
import { objectKeys } from 'movex-core-util';
import { MovexBoundResourceFromConfig } from 'apps/movex-demo/movex-react';
import { useState } from 'react';

type Props = {
  boundChatResource: MovexBoundResourceFromConfig<
    typeof movexConfig['resources'],
    'chat'
  >;
};

export const ChatPage: React.FC<Props> = ({ boundChatResource }) => {
  const { state, dispatch } = boundChatResource;

  const [msg, setMsg] = useState<string>();

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
          }}
        ></div>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          style={{
            border: '1px solid #ddd',
            width: '100%',
            height: '60px',
          }}
        />
        <button
          onClick={() => {
            console.log('msg');

            if (msg?.length && msg.length > 0) {
              dispatch({
                type: 'writeMessage',
                payload: {
                  participantId: '1',
                  msg,
                },
              });
            }
          }}
        >
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
          {objectKeys(state.participants).map((p) => (
            <div>
              {state.participants[p].id} | {state.participants[p].color}
            </div>
          ))}
        </div>
        <div>
          State
          <pre>{JSON.stringify(state, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
};
