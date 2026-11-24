import React from 'react';
import { Button } from '@curveroyaltysystems/react-ui-library';
import { Icon } from '@curveroyaltysystems/react-ui-library';

interface SearchIconProps {
  onSearchOpen: () => void;
}

export const SearchIcon: React.FC<SearchIconProps> = ({ onSearchOpen }) => {
  return (
    <Button variant="outline" size="icon" onClick={onSearchOpen} aria-label="Search">
      <Icon.Search className="h-4 w-4" />
    </Button>
  );
};
