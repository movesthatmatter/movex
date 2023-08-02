import React from 'react';

type Props = {
  className: string;
};

export const HeroText: React.FC<Props> = (props) => {
  return (
    <h1 className={props.className}>
      Build{' '}
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-movexBlue-400 via-indigo-500 to-purple-500 0from-movexBlue-300 sto-green-500 text-movexBlue-500">
        Multiplayer Apps.
      </span>{' '}
      Write only frontend code!
    </h1>
  );
};
