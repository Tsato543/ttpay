import { ReactNode, useEffect, useState } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

const PageTransition = ({ children }: PageTransitionProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger fade in on mount
    const timer = requestAnimationFrame(() => {
      setIsVisible(true);
    });
    
    return () => cancelAnimationFrame(timer);
  }, []);

  return (
    <div
      className={`page-transition ${isVisible ? 'page-visible' : ''}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.25s ease-out, transform 0.25s ease-out',
        minHeight: '100vh',
      }}
    >
      {children}
    </div>
  );
};

export default PageTransition;
