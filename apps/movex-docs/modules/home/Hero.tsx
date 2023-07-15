import React from 'react';
import { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import Link from 'next/link';
import { useCurrentTheme } from '../../hooks/useCurrentTheme';
import { Code, Pre } from 'nextra/components';

type Props = {};

const appTypes = ['App', 'Game', 'Chat', 'To-Do', 'Doc'];
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
    <div className="text-center pt-6 pb-4 lg:pt-32 lg:pb-20 lg:pl-14 lg:pr-14">
      <h1 className="text-6xl lg:text-8xl font-bold mb-4 lg:mb-10">
        <span className="text-transparent bg-clip-text bg-gradient-to-l from-movexBlue-600 to-movexBlue-300 text-movexBlue-500">Mutiplayer</span>{' '}
        <span
          className={`
          ${(currentTheme === 'dark' ? darkColors : lightColors)[indexes.color]}
          } p-1 lg:p-2 rounded-lg`}
          // className={`bg-orange-500 p-2 rounded-lg`}
        >
          {appTypes[indexes.appType]}
        </span>{' '}
        State without hassle.
      </h1>
      <h3 className="text-xl lg:text-2xl mb-7 !leading-normal text-slate-500">
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
      </h3>
      <div className="mx-auto flex items-center justify-center gap-5">
        <Link href="/docs/overview/get_started">
          <Button className="bg-gradient-to-r from-movexBlue-400 via-indigo-500 to-purple-500 hover:to-movexBlue-500 via-indigo-500 hover:from-purple-300">
            Get Started
          </Button>
        </Link>
        <Link href="https://github.com/movesthatmatter/movex" target='_blank'>
          <Button type='clear' className="">
            See Github
          </Button>
        </Link>
        {/* <Link href="#examples">
          <Button type="clear" className="">
            See Exmaples
          </Button>
        </Link> */}
      </div>

      <div
        className="mt-10 md:w-3/4 lg:w-1/2"
        style={{
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        <Pre hasCopyCode lang="bash">
          <Code>yarn add movex; yarn add --dev movex-service</Code>
        </Pre>
      </div>
    </div>
  );
};
