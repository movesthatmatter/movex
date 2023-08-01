import React from 'react';
import { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import Link from 'next/link';
import { useCurrentTheme } from '../../hooks/useCurrentTheme';
import { Code, Pre } from 'nextra/components';

type Props = {};

const appTypes = ['Apps', 'Game', 'Chat', 'To-Do', 'Doc'];
const lightColors = [
  'text-red-500',
  // 'text-blue-500',
  'text-green-500',
  'text-yellow-500',
  'text-orange-500',
  'text-purple-500',
];
const darkColors = [
  'text-red-500',
  // 'text-blue-500',
  'text-green-500',
  'text-yellow-500',
  'text-orange-500',
  'text-purple-500',
];

export const Hero: React.FC<Props> = () => {
  const [indexes, setIndexes] = useState({
    color: 0,
    appType: 0,
  });

  const currentTheme = useCurrentTheme();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setIndexes((prev) => ({
        appType: prev.appType === appTypes.length - 1 ? 0 : prev.appType + 1,
        color: prev.color === lightColors.length - 1 ? 0 : prev.color + 1,
      }));
    }, 3.5 * 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [indexes]);

  return (
    <div className="">
      <div className="flex">
        <div className="flex-1">
          <h1 className="text-6xl lg:text-7xl font-bold mb-4 lg:mb-10" style={{
            lineHeight: '5rem',
          }}>
            Build{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-movexBlue-400 via-indigo-500 to-purple-500 0from-movexBlue-300 sto-green-500 text-movexBlue-500">
              Mutiplayer Apps.
            </span>{' '}
            {/* <span
          className={`
          ${(currentTheme === 'dark' ? darkColors : lightColors)[indexes.color]}
          } p-1 lg:p-2 rounded-lg`}
          // className={`bg-orange-500 p-2 rounded-lg`}
        >
          {appTypes[indexes.appType]}
        </span>{' '} */}
            Write only frontend code.
            {/* <span className="text-transparent bg-clip-text bg-gradient-to-l from-movexBlue-600 to-movexBlue-300 text-movexBlue-500">Mutiplayer</span>{' '}
        <span
          className={`
          ${(currentTheme === 'dark' ? darkColors : lightColors)[indexes.color]}
          } p-1 lg:p-2 rounded-lg`}
          // className={`bg-orange-500 p-2 rounded-lg`}
        >
          {appTypes[indexes.appType]}
        </span>{' '}
        State without hassle. */}
          </h1>
          <p className="text-xl lg:text-2xl mb-7 !leading-normal text-slate-500 inline-flex">
            Movex is a{' '}
            <Link
              href="https://redux.js.org/introduction/getting-started"
              target="_blank"
              className="italic hover:underline"
            >
              "predictable state container*"
            </Link>{' '}
            for multiplayer applications.
            <br /> Server Authoritative by nature. No Server hassle by design.
          </p>
          

          
        </div>
      </div>
    </div>
  );
};
