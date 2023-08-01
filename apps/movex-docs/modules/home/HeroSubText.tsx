import Link from 'next/link';
import React from 'react';

type Props = {
  className: string;
};

export const HeroSubText: React.FC<Props> = (props) => {
  return (
    <h3 className={props.className}>
      Movex is a{' '}
      <Link
        href="https://redux.js.org/introduction/getting-started"
        target="_blank"
        className="italic hover:underline"
      >
        "predictable state container"
      </Link>{' '}
      for multiplayer apps or games, that allows you to focus on the front-end only, while it seamlessly takes care of the back-end.
    </h3>
  );
};
