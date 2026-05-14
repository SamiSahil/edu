import { useEffect, useState } from 'react';

export function useResponsive() {
  const getSize = () => {
    if (typeof window === 'undefined') return { width: 1280, isMobile: false, isTablet: false, isDesktop: true };
    const width = window.innerWidth;
    return {
      width,
      isMobile: width < 640,
      isTablet: width >= 640 && width < 1024,
      isDesktop: width >= 1024,
    };
  };

  const [state, setState] = useState(getSize);

  useEffect(() => {
    const onResize = () => setState(getSize());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return state;
}