import React from 'react';

type Props = {
  className: string;
};

export const HeroSubText: React.FC<Props> = (props) => {
  return (
    <h3 className={props.className}>
      Movex is a Redux inspired state management and synchronization tool that
      does the heavy lifting to share state between peers in a network.
      <br />
      <br />
      Build faster by only focusing on the App Logic & UI. Let Movex handle the
      rest!
    </h3>
  );
};
