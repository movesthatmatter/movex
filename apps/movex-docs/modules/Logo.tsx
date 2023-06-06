import React from 'react';
import { useCurrentTheme } from '../hooks/useCurrentTheme';

export const Logo: React.FC = () => {
  const currentTheme = useCurrentTheme();

  return (
    <img
      width="120"
      alt="Movex Logo"
      src={
        currentTheme === 'dark'
          ? 'https://user-images.githubusercontent.com/2099521/242976595-770bccdb-9edc-4fc6-8022-86e6336d9352.png'
          : 'https://user-images.githubusercontent.com/2099521/242976515-b42737d6-23c6-4c7f-8817-50124bbdedf8.png'
      }
    />
  );
};
