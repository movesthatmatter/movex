import { useEffect, useState } from 'react';
import { debounce } from 'debounce';

export type ContainerDimensions = {
  width: number;
  height: number;
  updated: boolean;
};

export function useContainerDimensions(
  targetContainer: HTMLElement = document.body // fallsback to body
) {
  const [dimensions, setDimensions] = useState<ContainerDimensions>({
    width: 0,
    height: 0,
    updated: false,
  });

  useEffect(() => {
    const onResizeHandler = () => {
      setDimensions((prev) => {
        if (!targetContainer) {
          return prev;
        }

        const next = {
          width: targetContainer.offsetWidth,
          height: targetContainer.offsetHeight,
          updated: true,
        };

        // If nothing changed return prev!
        if (
          prev.height === next.height &&
          prev.width === next.width &&
          next.updated === true
        ) {
          return prev;
        }

        return next;
      });
    };

    onResizeHandler();

    window.addEventListener('resize', debounce(onResizeHandler, 250));

    return () => {
      window.removeEventListener('resize', onResizeHandler);
    };
  }, [targetContainer]);

  return dimensions;
}
