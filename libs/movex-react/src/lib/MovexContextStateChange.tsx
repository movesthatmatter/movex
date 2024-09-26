import React, { useContext, useEffect } from 'react';
import { MovexContext, type MovexContextProps } from './MovexContext';

type Props = React.PropsWithChildren<{
  /**
   * This is called only when the "clientId" or the status changes and not the state itself
   *
   * @param next
   * @returns
   */
  onStatusChange: (next: MovexContextProps<any>) => void;
}>;

export const MovexContextStateChange: React.FC<Props> = (props) => {
  const contextState = useContext(MovexContext);

  useEffect(() => {
    props.onStatusChange(contextState);
  }, [contextState.status]);

  return <>{props.children}</>;
};
