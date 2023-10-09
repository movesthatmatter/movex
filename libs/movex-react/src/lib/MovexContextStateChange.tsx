import React, { useContext, useEffect } from 'react';
import { MovexContext, MovexContextProps } from './MovexContext';

type Props = React.PropsWithChildren<{
  onChange: (next: MovexContextProps<any>) => void;
}>;

export const MovexContextStateChange: React.FC<Props> = (props) => {
  const contextState = useContext(MovexContext);

  useEffect(() => {
    props.onChange(contextState);
  }, [contextState.connected, contextState.clientId]);

  return <>{props.children}</>;
};
