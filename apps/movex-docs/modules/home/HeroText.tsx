import React from 'react';

type Props = {
  className: string;
};

export const HeroText: React.FC<Props> = (props) => {
  return (
    <h1 className={props.className}>
      Serverless{' '}
      <div className='hidden lg:block'/>
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-movexBlue-400 via-indigo-500 to-purple-500 0from-movexBlue-300 sto-green-500 text-movexBlue-500">
        Multiplayer Infrastructure
      </span>{' '}
      <div className='hidden lg:block'/>
      for JavaScript Games
      {/* Effortless realtime{' '}<br/> 
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-movexBlue-400 via-indigo-500 to-purple-500 0from-movexBlue-300 sto-green-500 text-movexBlue-500">
      data sharing
      </span>{' '}
      infrastructure */}
      {/* Build{' '}
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-movexBlue-400 via-indigo-500 to-purple-500 0from-movexBlue-300 sto-green-500 text-movexBlue-500">
        Multiplayer Apps
      </span>{' '}
      <div className='lg:hidden'/>
      faster with Movex. */}
      {/* with Frontend Code alone. */}
      {/* x times faster. */}
      {/* Write only frontend code! */}
    </h1>
  );
};
