import * as React from 'react';
import { MovexBoundResource } from 'movex-react';
import movexConfig from './movex.config';
import { initialState } from './movex';
import { useState } from 'react';
import { ResourceIdentifier, toResourceIdentifierStr } from 'movex-core-util';
import { GameUI } from './GameUI';
// import { MovexStoreItem } from "movex";
import { MovexLocalInstance } from 'movex-react-local-master';
import { MovexStoreItem } from 'movex-store';

type Props = {
  masterStore?: MovexStoreItem<any>;
};

export function Game(props: Props) {
  const [rpsRid, setRpsRid] = useState<ResourceIdentifier<'rps'>>();
  const [masterStateUpdated, setMasterStateUpdated] = useState(false);

  return (
    <div className="h-screen flex flex-1 flex-col md:flex-row bg-gradient-to-bl from-blue-400 via-indigo-500 to-purple-500">
      <MovexLocalInstance
        clientId="playerA"
        movexDefinition={movexConfig}
        onConnected={(movex) => {
          const reg = movex.register('rps');

          reg.create(initialState).map(({ rid }) => {
            setRpsRid(rid);

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
        {rpsRid && (
          <MovexBoundResource
            rid={rpsRid}
            movexDefinition={movexConfig}
            render={({ boundResource, clientId }) => (
              <div className="w-full flex-1">
                <GameUI boundResource={boundResource} userId={clientId} />
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
      {rpsRid && masterStateUpdated && (
        <MovexLocalInstance clientId="playerB" movexDefinition={movexConfig}>
          <MovexBoundResource
            rid={rpsRid}
            movexDefinition={movexConfig}
            render={({ boundResource, clientId }) => (
              <div className="w-full flex-1">
                <GameUI boundResource={boundResource} userId={clientId} />
              </div>
            )}
          />
        </MovexLocalInstance>
      )}
    </div>
  );
}
