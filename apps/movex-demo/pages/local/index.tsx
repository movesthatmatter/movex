import styled from '@emotion/styled';
import { MovexBoundResource } from 'movex-react';
import movexConfig from 'libs/movex-examples/src/movex.config';
import { useState } from 'react';
import { ResourceIdentifier } from 'movex-core-util';
import { Chat, Rps } from 'movex-examples';
import { MovexLocalInstance } from 'movex-react-local-master';

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
      yeeeep
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 40,
          height: '100%',
        }}
      >
        <MovexLocalInstance
          clientId="client-1"
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
                <Rps.Main boundResource={boundResource} userId={clientId} />
              )}
            />
          )}
          {chatRid && (
            <MovexBoundResource
              rid={chatRid}
              movexDefinition={movexConfig}
              render={({ boundResource, clientId }) => (
                <Chat.Main
                  boundChatResource={boundResource}
                  userId={clientId}
                />
              )}
            />
          )}
        </MovexLocalInstance>

        {rpsRid && chatRid && (
          <div>
            <MovexLocalInstance
              clientId="client-b"
              movexDefinition={movexConfig}
            >
              <MovexBoundResource
                rid={rpsRid}
                movexDefinition={movexConfig}
                render={({ boundResource, clientId }) => (
                  <Rps.Main boundResource={boundResource} userId={clientId} />
                )}
              />
              <MovexBoundResource
                rid={chatRid}
                movexDefinition={movexConfig}
                render={({ boundResource, clientId }) => (
                  <Chat.Main
                    boundChatResource={boundResource}
                    userId={clientId}
                  />
                )}
              />
            </MovexLocalInstance>
            {/* TODO here we have an issue. Normally these 2 should be ableto be created simulatneously, but htey fail now, both taking the same slot 
          – maybe due to the fact that the master doesnt hae time to respond??? */}
            {/* <MovexInstance
            clientId="client-b"
            movexDefinition={movexConfig}
            rid={createdRid}
            render={({ boundResource, clientId }) => (
              <Rps.Main
                boundResource={boundResource as any}
                userId={clientId}
              />
            )}
          /> */}
          </div>
        )}
      </div>
    </StyledPage>
  );
}

export default Index;
