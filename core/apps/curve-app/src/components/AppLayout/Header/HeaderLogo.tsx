import React from 'react';

interface HeaderLogoProps {
  logo: string;
  alt?: string;
}

export const HeaderLogo: React.FC<HeaderLogoProps> = ({ logo, alt = 'Curve' }) => {
  return logo ? <img src={logo} alt={alt} className="h-6 w-auto" /> : null;
};
