import React from 'react';
import { PropsWithChildren, useMemo } from 'react';

type Props = PropsWithChildren<{
  type?: 'primary' | 'secondary' | 'clear';
  onClick?: () => void;
  className?: string;
}>;

export const Button: React.FC<Props> = ({
  children,
  type = 'primary',
  onClick,
  className,
}) => {
  const localClassName = useMemo(() => {
    if (type === 'primary') {
      return 'bg-indigo-500 hover:bg-indigo-600 p-3 pl-5 pr-5 text-white font-bold rounded-xl';
    }

    if (type === 'clear') {
      return 'dark:hover:bg-slate-700 hover:bg-slate-200 p-3 dark:text-gray-300 text-gray-600 font-bold rounded-xl dark:bg-slate-800 bg-slate-100';
    }

    return;
  }, [type, className]);

  return (
    <button className={localClassName + ' ' + className} onClick={onClick}>
      {children}
    </button>
  );
};
