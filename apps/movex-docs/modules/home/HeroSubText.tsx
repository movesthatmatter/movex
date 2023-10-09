import React from 'react';

type Props = {
  className: string;
};

// Simplify Multiplayer State Management: Build Apps faster with Movex. Just Code UI and Logic, Let Movex Handle the Rest

export const HeroSubText: React.FC<Props> = (props) => {
  return (
    <h3 className={props.className}>
      {/* Movex state */}
      {/* Redux inspired state container that is shared between all peers in a network. */}
      Movex is an <i><b>Open Source</b></i> State Management and Synchronization library that abstracts the
      server-side and backend logic to share state between multiple users of
      your app.
      <br />
      <br />
      <b>
        🚀 Build 10x faster by focusing only on the frontend – Movex handles the
        rest!
      </b>
      {/* <br />
      <br />
      Best part - the backend is generated automatically for you. */}
      {/* Movex synchonizes state between all the users in an app. */}
      {/* Redux inspired state management tool for more than one user in the network. */}
      {/* A state management library that redefines backend management for apps that need to share state with multiple users in realtime. */}
      {/* It abstracts the backend away, meaning you don't have to deal with network protocols, servers, 
      It allows you to focus on the front-end, while it seamlessly
      takes care of the back-end. */}
    </h3>
  );
};
