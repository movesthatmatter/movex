import React, { useEffect, useState } from 'react';
import { logsy, noop } from 'movex-core-util';
import {
  BaseMovexDefinitionResourcesMap,
  LocalStorageMovexStore,
  MovexDefinition,
  MovexMaster,
} from 'movex';
import { MovexLocalContext, MovexLocalContextProps } from './MovexLocalContext';

type Props<TMovexConfigResourcesMap extends BaseMovexDefinitionResourcesMap> =
  React.PropsWithChildren<{
    movexDefinition: MovexDefinition<TMovexConfigResourcesMap>;
    onInit?: (master: MovexMaster.MovexMasterServer) => void;
  }>;

/**
 * TODO: This could be moved out of the refular library into a separate one only for devs who don't look for multiplayer
 *
 * @param param0
 * @returns
 */
export const MovexLocalMasterProvider: React.FC<Props<{}>> = ({
  onInit = noop,
  ...props
}) => {
  const localStorageMovexStore = new LocalStorageMovexStore(
    window.localStorage
  );

  localStorageMovexStore.onCreated((s) => {
    logsy.group('[Master.LocalStore] onCreated');
    logsy.log('Item', s);
    logsy.log('All Store', localStorageMovexStore.all());
    logsy.groupEnd();
  });

  localStorageMovexStore.onUpdated((s) => {
    logsy.group('[Master.LocalStore] onUpdated');
    logsy.log('Item', s);
    logsy.log('All Store', localStorageMovexStore.all());
    logsy.groupEnd();
  });

  const [contextState] = useState<MovexLocalContextProps>({
    master: MovexMaster.initMovexMaster(
      props.movexDefinition,
      localStorageMovexStore
    ),
  });

  useEffect(() => {
    if (contextState.master) {
      onInit(contextState.master);
    }
  }, [contextState]);

  return (
    <MovexLocalContext.Provider value={contextState}>
      {props.children}
    </MovexLocalContext.Provider>
  );
};
