import { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useCurrentTheme } from 'apps/movex-docs/hooks/useCurrentTheme';

type Props = {};

const appTypes = ['App', 'Game', 'Chat', 'To-Do', 'Doc'];
const lightColors = ['bg-red-200', 'bg-blue-200', 'bg-green-200', 'bg-yellow-200', 'bg-orange-200', 'bg-purple-200'];
const darkColors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-orange-500', 'bg-purple-500'];


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
    <div className="text-center pt-6 pb-4 lg:pt-32 lg:pb-20">
      <h1 className="text-4xl lg:text-6xl font-bold mb-4 lg:mb-10">
        Share your{' '}
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
      <h3 className="text-xl lg:text-3xl mb-7">
        Movex is a <span className="italic">"predictable state container"</span>{' '}
        for multi-player applications.
        <br /> Server Authoritative by nature. No Server hassle by design.
      </h3>
      <div className="mx-auto flex items-center justify-center gap-5">
        <Link href="/docs/what">
          <Button className='bg-gradient-to-r from-movexBlue-400 via-indigo-500 to-purple-500 hover:to-movexBlue-500 via-indigo-500 hover:from-purple-300'>See Docs</Button>
        </Link>
        <Link target="_blank" href="https://github.com/movesthatmatter/movex">
          <Button type="clear" className=''>
            Github
            <span aria-hidden="true">→</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};
