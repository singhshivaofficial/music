import React from 'react';

interface WaveLogoProps {
  className?: string;
  size?: number;
}

export const WaveLogo: React.FC<WaveLogoProps> = ({ className = 'w-9 h-9', size }) => {
  return (
    <img
      src="/logo.svg"
      alt="Wave Logo"
      className={`${className} flex-shrink-0`}
      style={size ? { width: size, height: size, objectFit: 'contain' } : { objectFit: 'contain' }}
    />
  );
};
