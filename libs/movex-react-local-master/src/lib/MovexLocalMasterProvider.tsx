import React, { useEffect, useState } from 'react';
import {
  invoke,
  globalLogsy,
  noop,
  emptyFn,
  type StringKeys,
  type GetReducerState,
  type BaseMovexDefinitionResourcesMap,
  type MovexDefinition,
  LoggingEvent,
} from 'movex-core-util';
import { MemoryMovexStore, type MovexStoreItem } from 'movex-store';
import { MovexMasterServer, initMovexMaster } from 'movex-master';
import { MovexLocalContext, MovexLocalContextProps } from './MovexLocalContext';

const logsy = globalLogsy.withNamespace('[MovexLocalMasterProvider]');

type Props<TMovexConfigResourcesMap extends BaseMovexDefinitionResourcesMap> =
  React.PropsWithChildren<{
    movexDefinition: MovexDefinition<TMovexConfigResourcesMap>;
    onInit?: (master: MovexMasterServer) => void;
    onMasterResourceUpdated?: <
      TResourceType extends StringKeys<TMovexConfigResourcesMap>
    >(
      item: MovexStoreItem<
        GetReducerState<TMovexConfigResourcesMap[TResourceType]>,
        TResourceType
      >,
      updateKind: 'create' | 'update'
    ) => void;
    logger?: {
      onLog: (event: LoggingEvent) => void;
    };
  }>;

/**
 * TODO: This could be moved out of the refular library into a separate one only for devs who don't look for multiplayer
 *
 * @param param0
 * @returns
 */
export const MovexLocalMasterProvider: React.FC<
  Props<BaseMovexDefinitionResourcesMap>
> = ({ onInit = noop, onMasterResourceUpdated = noop, logger, ...props }) => {
  const [contextState, setContextState] = useState<MovexLocalContextProps>();

  useEffect(() => {
    if (window) {
      // It is possible to use the local storage and get updates
      //  but It's too complex for now. Will build probably when we need
      // to slow the traffic on the server with the demo games
      // const localStorageMovexStore = new LocalStorageMovexStore(
      //   window.localStorage
      // );

      // window.addEventListener("storage", (e) => {
      //   // When local storage changes, dump the list to
      //   // the console.
      //   console.log('yess', e.key);
      // });

      const localStore = new MemoryMovexStore<
        typeof props['movexDefinition']['resources']
      >();

      const unsubscribers = [
        localStore.onCreated((item) => {
          logsy.info('onCreated', { item });

          onMasterResourceUpdated(item as any, 'create');
        }),
        localStore.onUpdated((item) => {
          logsy.info('onUpdated', { item });

          onMasterResourceUpdated(item as any, 'update');
        }),
      ];

      setContextState({
        master: initMovexMaster(props.movexDefinition, localStore),
      });

      return () => {
        unsubscribers.forEach(invoke);
      };
    }

    return emptyFn;
  }, []);

  useEffect(() => {
    if (contextState?.master) {
      onInit(contextState.master);
    }
  }, [contextState]);

  useEffect(() => {
    if (logger) {
      return globalLogsy.onLog(logger.onLog);
    }

    return () => {};
  }, [logger]);

  if (!contextState) {
    return null;
  }

  return (
    <MovexLocalContext.Provider value={contextState}>
      {props.children}
    </MovexLocalContext.Provider>
  );
};
