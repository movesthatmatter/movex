import React, { useMemo } from 'react';
import { useContainerDimensions } from '../../hooks/useContainerDimensions';

type Props = {
  fallbackComponent?: React.ReactNode;
  mobileComponent: React.ReactNode;
  desktopComponent: React.ReactNode;
  breakpointPx?: number;
};

export const DisplayAtBreakpoints: React.FC<Props> = ({
  fallbackComponent = null,
  mobileComponent,
  desktopComponent,
  breakpointPx = 1024,
}) => {
  // const [display, setDisplay] = useState<null | 'mobile' | 'desktop'>();
  const bodyDimensions = useContainerDimensions();

  // useEffect(() => {
  //   // Only show after mount
  //   const timeoutId = setTimeout(() => {
  //     setDisplay(true);
  //   }, 100);

  //   return () => {
  //     clearTimeout(timeoutId);
  //   };
  // }, []);

  const display = useMemo(
    () => (bodyDimensions.width > breakpointPx ? 'desktop' : 'mobile'),
    [bodyDimensions.width, breakpointPx]
  );

  // if (!display) {
  //   return <>{fallbackComponent}</>;
  // }

  if (display === 'desktop') {
    return <>{desktopComponent}</>;
  }

  if (display === 'mobile') {
    return <>{mobileComponent}</>;
  }

  return null;
};
