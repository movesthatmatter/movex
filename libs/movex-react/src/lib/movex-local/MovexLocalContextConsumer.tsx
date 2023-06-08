import React, { useContext, useEffect } from 'react';
import { MovexLocalContext, MovexLocalContextProps } from './MovexLocalContext';

type Props = {
  onMasterReady: (c: NonNullable<MovexLocalContextProps['master']>) => void;
};

export const MovexLocalContextConsumerProvider: React.FC<Props> = ({
  onMasterReady,
}) => {
  const context = useContext(MovexLocalContext);

  useEffect(() => {
    if (context.master) {
      onMasterReady(context.master);
    }
  }, [context]);

  return null;
};
