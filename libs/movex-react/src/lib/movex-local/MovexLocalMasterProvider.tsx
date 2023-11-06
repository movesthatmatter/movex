import React, { useEffect, useState } from 'react';
import {
  invoke,
  logsy,
  noop,
  emptyFn,
  type StringKeys,
  type GetReducerState,
  type BaseMovexDefinitionResourcesMap,
  type MovexDefinition,
} from 'movex-core-util';
import { MemoryMovexStore, type MovexStoreItem } from '@movex/movex-store';
import { MovexMasterServer, initMovexMaster } from '@movex/movex-master';
import { MovexLocalContext, MovexLocalContextProps } from './MovexLocalContext';

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
  }>;

/**
 * TODO: This could be moved out of the refular library into a separate one only for devs who don't look for multiplayer
 *
 * @param param0
 * @returns
 */
export const MovexLocalMasterProvider: React.FC<
  Props<BaseMovexDefinitionResourcesMap>
> = ({ onInit = noop, onMasterResourceUpdated = noop, ...props }) => {
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
        localStore.onCreated((s) => {
          logsy.group('[Master.LocalStore] onCreated');
          logsy.log('Item', s);
          logsy.log('All Store', localStore.all());
          logsy.groupEnd();

          onMasterResourceUpdated(s as any, 'create');
        }),
        localStore.onUpdated((s) => {
          logsy.group('[Master.LocalStore] onUpdated');
          logsy.log('Item', s);
          logsy.log('All Store', localStore.all());
          logsy.groupEnd();

          onMasterResourceUpdated(s as any, 'update');
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

  if (!contextState) {
    return null;
  }

  return (
    <MovexLocalContext.Provider value={contextState}>
      {props.children}
    </MovexLocalContext.Provider>
  );
};
