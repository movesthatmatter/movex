import React from 'react';
import { useCurrentTheme } from '../hooks/useCurrentTheme';

export const Logo: React.FC = () => (
  <img
    width="120"
    alt="Movex Logo"
    src={
      useCurrentTheme() === 'dark'
        ? '/static/logo_b_transparent@3x.png'
        : '/static/logo_b_white_transparent@3x.png'
    }
  />
);
