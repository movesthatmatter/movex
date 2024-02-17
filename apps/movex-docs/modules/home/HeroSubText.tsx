import React from 'react';

type Props = {
  className: string;
};

export const HeroSubText: React.FC<Props> = (props) => {
  return (
    <h3 className={props.className}>
      {/* Movex is an{' '}
      <i>
        <b>Open Source</b>
      </i>{' '}
      State Management and Synchronization library that abstracts the
      server-side and backend logic to share state between multiple users of
      your app. */}
      {/* Build multiplayer games, chat apps or anything in between without worrying
      about the server side, backend logic or even the network! Works with React
      out of the box! */}
      {/* <br />
      <br /> */}
        Cut the development effort in half and ship way faster by abstracting the backend logic and server-side away with Movex! 🚀
      <b>
        {/* 🚀 Build way faster by focusing only on the frontend – Movex handles the
        rest! */}
      </b>
    </h3>
  );
};
