import React, { useContext, useEffect } from 'react';
import { MovexContext, type MovexContextProps } from './MovexContext';

type Props = React.PropsWithChildren<{
  render: (next: MovexContextProps<any>) => void;
}>;

export const MovexConnection: React.FC<Props> = (props) => {
  const contextState = useContext(MovexContext);

  return <>{props.render(contextState)}</>;
};
