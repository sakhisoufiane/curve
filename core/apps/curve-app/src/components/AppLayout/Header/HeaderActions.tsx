import React from 'react';
import { Button, Icon } from '@curveroyaltysystems/react-ui-library';
import { NotificationMenu } from './Notifications';
import { SearchIcon } from './SearchIcon';
import { useUserStore } from '@/stores/user.store';

interface HeaderActionsProps {
  showHelpLink?: boolean;
  onSearchOpen?: () => void;
}

export const HeaderActions: React.FC<HeaderActionsProps> = ({ showHelpLink = true, onSearchOpen }) => {
  const { userType } = useUserStore();

  return (
    <>
      {showHelpLink && userType === 'payee' && (
        <Button variant="outline" size="sm" onClick={() => window.open('https://curveforartists.com', '_blank')}>
          <Icon.ExternalLink className="h-4 w-4" />
          Help
        </Button>
      )}
      <SearchIcon onSearchOpen={onSearchOpen!} />
      <NotificationMenu />
      {/* TODO: Add language menu */}
      {/* <LanguageMenu /> */}
      {/* TODO: Add theme toggle */}
      {/* <ThemeToggle /> */}
    </>
  );
};
