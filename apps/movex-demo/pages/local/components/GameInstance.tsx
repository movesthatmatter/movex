import { PropsWithChildren } from 'react';

type Props = PropsWithChildren<{}>;

export const GameInstance: React.FC<Props> = (props) => {
  return <div>{props.children}</div>;
};
