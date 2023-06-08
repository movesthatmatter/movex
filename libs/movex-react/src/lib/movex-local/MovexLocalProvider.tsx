import React, { useContext, useEffect, useState } from 'react';
import { MovexClient, invoke, noop } from 'movex-core-util';
import {
  BaseMovexDefinitionResourcesMap,
  Master,
  MovexDefinition,
} from 'movex';
import { MovexContext, MovexContextProps } from '../MovexContext';
import { MovexLocalContext } from './MovexLocalContext';
import { getUuid } from 'libs/movex/src/lib/util';
import { MockConnectionEmitter } from 'libs/movex/src/specs/util/MockConnectionEmitter';
import { orchestrateDefinedMovex } from 'libs/movex/src/specs/util/orchestrator';

type Props<TResourcesMap extends BaseMovexDefinitionResourcesMap> =
  React.PropsWithChildren<{
    movexDefinition: MovexDefinition<TResourcesMap>;
    clientId?: MovexClient['id'];
    onConnected?: (
      state: Extract<MovexContextProps<TResourcesMap>, { connected: true }>
    ) => void;
  }>;

/**
 * TODO: This could be moved out of the refular library into a separate one only for devs who don't look for multiplayer
 * 
 * TODO: This needs to be a class so the generic TResourcesMap can be passed in!
 *
 * @param param0
 * @returns
 */
export const MovexLocalProvider: React.FC<Props<any>> = ({
  onConnected = noop,
  ...props
}) => {
  const master = useContext(MovexLocalContext).master;

  const [contextState, setContextState] = useState<
    MovexContextProps<typeof props['movexDefinition']['resources']>
  >({
    connected: false,
    clientId: undefined,
  });

  useEffect(() => {
    // const storedClientId =
    //   window.localStorage.getItem('movexCliendId') || undefined;
    if (!master) {
      return;
    }

    if (contextState.connected) {
      // here disconnect and reconnect b/c it means one of the url or clientId changed, so need another instance!
      // contextState.movex.

      return;
    }

    const clientId = props.clientId || getUuid();
    const emitterOnMaster = new MockConnectionEmitter(clientId, 'master-emitter');

    emitterOnMaster._onEmitted((e) => {
      console.log('')
      console.log('[MovexLocalProvider]', e.event);
    })

    const connectionToClient = new Master.ConnectionToClient(
      clientId,
      emitterOnMaster
    );

    const unsubscribe = master.addClientConnection(connectionToClient);

    const mockedMovex = orchestrateDefinedMovex(
      props.movexDefinition,
      clientId,
      emitterOnMaster
    );

    const nextState = {
      connected: true,
      movex: mockedMovex.movex,
      clientId: mockedMovex.movex.getClientId(),
      movexDefinition: props.movexDefinition,
    } as const;

    setContextState(nextState);

    onConnected(nextState);

    return () => {
      // unsubscribe();
      // mockedMovex.destroy();
    };

    // TODO: Maye add destroyer?
  }, [master, onConnected, props.clientId]);

  return (
    <MovexContext.Provider value={contextState}>
      {props.children}
    </MovexContext.Provider>
  );
};

// export class MovexLocalProvider<TResourcesMap extends BaseMovexDefinitionResourcesMap> implements React.Component<Props<>> = ({
//   onConnected = noop,
//   ...props
// }) => {
//   const master = useContext(MovexLocalContext).master;

//   const [contextState, setContextState] = useState<
//     MovexContextProps<typeof props['movexDefinition']['resources']>
//   >({
//     connected: false,
//     clientId: undefined,
//   });

//   useEffect(() => {
//     // const storedClientId =
//     //   window.localStorage.getItem('movexCliendId') || undefined;
//     if (!master) {
//       return;
//     }

//     if (contextState.connected) {
//       // here disconnect and reconnect b/c it means one of the url or clientId changed, so need another instance!
//       // contextState.movex.

//       return;
//     }

//     const clientId = props.clientId || getUuid();
//     const emitterOnMaster = new MockConnectionEmitter(clientId);
//     const connectionToClient = new Master.ConnectionToClient(
//       clientId,
//       emitterOnMaster
//     );

//     const unsubscribe = master.addClientConnection(connectionToClient);

//     const mockedMovex = orchestrateDefinedMovex(
//       props.movexDefinition,
//       clientId,
//       emitterOnMaster
//     );

//     const nextState = {
//       connected: true,
//       movex: mockedMovex.movex,
//       clientId: mockedMovex.movex.getClientId(),
//       movexDefinition: props.movexDefinition,
//     } as const;

//     setContextState(nextState);

//     onConnected(nextState, props.movexDefinition);

//     return () => {
//       unsubscribe();
//       mockedMovex.destroy();
//     };

//     // TODO: Maye add destroyer?
//   }, [master, onConnected, props.clientId]);

//   return (
//     <MovexContext.Provider value={contextState}>
//       {props.children}
//     </MovexContext.Provider>
//   );
// };
