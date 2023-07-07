import styled from '@emotion/styled';
import { MovexBoundResource, MovexLocalInstance } from 'movex-react';
import movexConfig from 'libs/movex-examples/src/movex.config';
import { useState } from 'react';
import { ResourceIdentifier } from 'movex-core-util';
import { Chat, Rps } from 'movex-examples';
import { GameInstance } from './components/GameInstance';

const StyledPage = styled.div`
  .page {
  }
`;

export function Index() {
  const [rpsRid, setRpsRid] = useState<ResourceIdentifier<'rps'>>();
  const [chatRid, setChatRid] = useState<ResourceIdentifier<'chat'>>();

  /*
   * Replace the elements below with your own.
   *
   * Note: The corresponding styles are in the ./index.@emotion/styled file.
   */
  return (
    <StyledPage>
      <div
        style={{
          display: 'flex',
          // flexDirection: 'row',
          // gap: 20,
          // background: 'red',
          height: '100vh',
        }}
      >
        <MovexLocalInstance
          clientId="Player-1"
          movexDefinition={movexConfig}
          onConnected={(movex) => {
            movex
              .register('rps')
              .create(Rps.initialState)
              .map(({ rid }) => {
                setRpsRid(rid);
              });

            movex
              .register('chat')
              .create(Chat.initialChatState)
              .map(({ rid }) => {
                setChatRid(rid);
              });
          }}
        >
          {rpsRid && (
            <MovexBoundResource
              rid={rpsRid}
              movexDefinition={movexConfig}
              render={({ boundResource, clientId }) => (
                <GameInstance>
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <div className="white block rounded bg-neutral-100">
                        <Rps.Main
                          boundResource={boundResource}
                          userId={clientId}
                        />
                      </div>
                    </div>
                    {/* <div
                      style={{
                        background: 'rgba(0, 0, 0, .05)',
                        padding: '.3em .5em',
                        // textAlign: 'right',
                      }}
                    >
                      {clientId}
                    </div> */}
                  </div>
                </GameInstance>
              )}
            />
          )}
        </MovexLocalInstance>

        <div
          style={{
            width: 20,
            height: '100%',
            background: 'rgba(0, 0, 0, .2)',
          }}
        />

        {rpsRid && chatRid && (
          <MovexLocalInstance clientId="Player-2" movexDefinition={movexConfig}>
            <MovexBoundResource
              rid={rpsRid}
              movexDefinition={movexConfig}
              render={({ boundResource, clientId }) => (
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Rps.Main boundResource={boundResource} userId={clientId} />
                  </div>
                  <div
                    style={{
                      background: 'rgba(0, 0, 0, .05)',
                      padding: '.3em .5em',
                      textAlign: 'right',
                    }}
                  >
                    {clientId}
                  </div>
                </div>
              )}
            />
          </MovexLocalInstance>
        )}
      </div>
    </StyledPage>
  );
}

export default Index;
