
import React, { useState } from 'react';

interface BrandLogoProps {
  variant?: 'dark' | 'light';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const BrandLogo: React.FC<BrandLogoProps> = ({ variant = 'dark', className = '', size = 'md' }) => {
  const [hasError, setHasError] = useState(false);

  // Fallback styling
  const textColor = variant === 'dark' ? 'text-[#9d1c24]' : 'text-red-400';
  const subTextColor = variant === 'dark' ? 'text-[#575756]' : 'text-white';
  
  const textSizeClass = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-4xl',
    xl: 'text-6xl'
  }[size];

  const subTextSize = {
    sm: 'text-[0.4rem]',
    md: 'text-[0.55rem]',
    lg: 'text-[0.7rem]',
    xl: 'text-base'
  }[size];

  const heightClass = {
    sm: 'h-8 sm:h-9',
    md: 'h-12',
    lg: 'h-16',
    xl: 'h-24 md:h-28'
  }[size];

  if (!hasError) {
    return (
      <div className={`flex items-center select-none ${className}`}>
        <img 
          src="/logo.png" 
          alt="Real Frio" 
          onError={() => setHasError(true)}
          className={`${heightClass} w-auto object-contain block`}
        />
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-start select-none leading-none ${className}`}>
      <div className="flex items-center">
        <span className={`font-black tracking-tighter ${textSizeClass} ${textColor} uppercase`}>
          Real Frio
        </span>
      </div>
      
      <span className={`font-bold tracking-[0.4em] ${subTextColor} uppercase mt-1 ${subTextSize}`}>
        Assistência Técnica
      </span>
    </div>
  );
};

export default BrandLogo;
