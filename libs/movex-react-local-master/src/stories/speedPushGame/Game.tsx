import * as React from 'react';
import { MovexBoundResource } from 'movex-react';
// import movexConfig from '../rpsGame/movex.config';
// import { initialState } from '../rpsGame/movex';
import { useState } from 'react';
import { ResourceIdentifier } from 'movex-core-util';
import { MovexLocalInstance } from 'movex-react-local-master';
import { MovexStoreItem } from 'movex-store';
import movexConfig from './movex.config';
import { initialState } from './movex';

type Props = {
  masterStore?: MovexStoreItem<any>;
};

export function Game(props: Props) {
  const [rid, setRid] = useState<ResourceIdentifier<'speedPushGame'>>();
  const [masterStateUpdated, setMasterStateUpdated] = useState(false);

  return (
    <div className="h-screen flex flex-1 flex-col md:flex-row bg-gradient-to-bl from-blue-400 via-indigo-500 to-purple-500">
      <MovexLocalInstance
        clientId="redPlayer"
        movexDefinition={movexConfig}
        onConnected={(movex) => {
          const reg = movex.register('speedPushGame');

          reg.create(initialState).map(({ rid }) => {
            setRid(rid);

            setTimeout(() => {
              // HACK. Fake the Maser State Update in order to fix a current issue with working with
              // master state values, instead of local ones.
              // See https://github.com/movesthatmatter/movex/issues/9 for more info.
              // This feature witll be added in the close future
              setMasterStateUpdated(true);
            }, 10);
          });
        }}
      >
        {rid && (
          <MovexBoundResource
            rid={rid}
            movexDefinition={movexConfig}
            render={({ boundResource, clientId }) => (
              <div className="w-full flex-1 flex items-center justify-center">
                <button
                  className="bg-red-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  onClick={() =>
                    boundResource.dispatch({
                      type: 'push',
                      payload: { at: new Date().getTime(), by: 'red' },
                    })
                  }
                >
                  Push
                </button>
              </div>
            )}
          />
        )}
      </MovexLocalInstance>
      <div className="flex-1 flex flex-col h-full">
        <div className="flex-1 flex justify-center items-center">
          <span role="img" aria-label="versus" className="text-5xl">
            🆚
          </span>
        </div>
        {props.masterStore && (
          <div
            className="hidden md:block bg-red-100 bg-opacity-10 text-center pb-2 pt-2 pl-2 pr-2 overflow-scroll flex flex-col justify-center"
            style={{
              flex: 0.55,
            }}
          >
            <div className="flex flex-col flex-1 nbg-green-100 h-full">
              <p className="font-bold pb-4 capitalize text-white">
                Master Movex State
              </p>
              <pre
                className="text-xs text-left text-white flex flex-1 justify-center items-center nbg-red-100"
                lang="json"
              >
                <code>
                  {JSON.stringify(
                    {
                      submissions: props.masterStore.state[0].submissions,
                      winner: props.masterStore.state[0].winner,
                    },
                    null,
                    1
                  )}
                </code>
              </pre>
            </div>
          </div>
        )}
      </div>
      {rid && masterStateUpdated && (
        <MovexLocalInstance clientId="bluPlayer" movexDefinition={movexConfig}>
          <MovexBoundResource
            rid={rid}
            movexDefinition={movexConfig}
            render={({ boundResource, clientId }) => (
              <div className="w-full flex-1 flex items-center justify-center ">
                <button
                  onClick={() =>
                    boundResource.dispatch({
                      type: 'push',
                      payload: { at: new Date().getTime(), by: 'blu' },
                    })
                  }
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Push
                </button>
              </div>
            )}
          />
        </MovexLocalInstance>
      )}
    </div>
  );
}
