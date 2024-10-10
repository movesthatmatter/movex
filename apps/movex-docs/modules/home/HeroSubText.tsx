import React from 'react';

type Props = {
  className: string;
};

export const HeroSubText: React.FC<Props> = (props) => {
  return (
    <h3 className={props.className}>
      Accelerate your development process and deliver faster by abstracting
      the backend complexities with Movex! 🚀
    </h3>
  );
};
