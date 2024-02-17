import React from 'react';
import { useConfig } from 'nextra-theme-docs';
import Link from 'next/link';

type Props = {
  name: string;
  desc: string;
  link: string;
  icon: string | { config: string };
  className?: string;
};

export const CommunityItem: React.FC<Props> = ({ link, name, desc, icon }) => {
  const nextraConfig = useConfig();

  const Icon =
    (typeof icon === 'string' ? icon : nextraConfig[icon.config]?.icon) || null;

  return (
    <Link
      href={link}
      target="_blank"
      className="flex-1 flex flex-col items-center text-center bg-opacity-10 hover:bg-opacity-20 bg-slate-500 rounded-lg p-5 border border-slate-500 border-opacity-30"
    >
      <div>{Icon}</div>
      <h4 className="text-lg font-bold md:mb-2">{name}</h4>
      <p className="hidden md:block">{desc}</p>
    </Link>
  );
};
