import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';

const LandingLayout = () => {
  useEffect(() => {
    const prevBackground = document.body.style.backgroundColor;
    const prevColor = document.body.style.color;
    const prevOverflow = document.body.style.overflow;
    document.body.style.backgroundColor = 'hsl(0 0% 100%)';
    document.body.style.color = 'hsl(222.2 84% 4.9%)';
    document.body.style.overflow = 'auto';
    return () => {
      document.body.style.backgroundColor = prevBackground;
      document.body.style.color = prevColor;
      document.body.style.overflow = prevOverflow || 'auto';
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Outlet />
    </div>
  );
};

export default LandingLayout;
