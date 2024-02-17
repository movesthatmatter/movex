import React from 'react';
import { useCurrentTheme } from '../hooks/useCurrentTheme';

type Props = {
  className?: string;
};

export const MovexDiagram: React.FC<Props> = ({ className }) => (
  <img
    alt="Movex Diagram"
    className={className}
    src={
      useCurrentTheme() === 'dark'
        ? '/static/diagram/diagram_c_dark@1x_optimized.png'
        : '/static/diagram/diagram_c@1x_optimized.png'
    }
  />
);
