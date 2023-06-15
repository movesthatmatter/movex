import React, { useEffect, useState } from 'react';
import { noop } from 'movex-core-util';
import {
  BaseMovexDefinitionResourcesMap,
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
  const [contextState] = useState<MovexLocalContextProps>({
    master: MovexMaster.initMovexMaster(props.movexDefinition),
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
