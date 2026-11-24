import React from 'react';
import {
  Button,
  Icon,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@curveroyaltysystems/react-ui-library';
import { HeaderBadges } from './HeaderBadges';
import { useTranslation } from '@curveroyaltysystems/i18n';
import { useUserStore } from '@/stores/user.store';

interface MobileHeaderMenuProps {
  showHelpLink?: boolean;
  isInTrial?: boolean;
  trialDaysLeft?: number;
  onSearchOpen?: () => void;
}

export const MobileHeaderMenu: React.FC<MobileHeaderMenuProps> = ({
  showHelpLink = true,
  isInTrial,
  trialDaysLeft,
  onSearchOpen,
}) => {
  const { t } = useTranslation();
  const { userType } = useUserStore();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Menu">
          <Icon.EllipsisVertical size={20} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="bottom" align="end" className="w-72">
        {onSearchOpen && (
          <DropdownMenuItem className="gap-3 py-3 cursor-pointer" onClick={onSearchOpen}>
            <Icon.Search className="h-4 w-4 shrink-0" />
            <span>{t('search')}</span>
          </DropdownMenuItem>
        )}

        {isInTrial && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2">
              <HeaderBadges isInTrial={isInTrial} trialDaysLeft={trialDaysLeft} />
            </div>
          </>
        )}

        {showHelpLink && userType === 'payee' && (
          <DropdownMenuItem
            className="gap-3 py-3 cursor-pointer"
            onClick={() => window.open('https://curveforartists.com', '_blank')}
          >
            <Icon.ExternalLink className="h-4 w-4 shrink-0" />
            <span>{t('help')}</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
