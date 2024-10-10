import React from 'react';
import { Logo } from '../modules/Logo';
import { HeartIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <div className="flex flex-1 flex-col md:flex-row items-center md:justify-between md:items-end">
      <div>
        <Logo />
      </div>
      <div className="pt-4 text-center md:text-right">
        <span>
          Movex is a{' '}
          <Link href="https://github.com/movesthatmatter" target="_blank" className="font-bold">
            Moves That Matter
          </Link>{' '}
          project.
        </span>
        <p>
          Made with{' '}
          <HeartIcon
            style={{
              width: '20px',
              display: 'inline',
            }}
          />{' '}
          around the world.
        </p>
      </div>
    </div>
  );
};
