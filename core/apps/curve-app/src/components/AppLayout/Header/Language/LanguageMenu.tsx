import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@curveroyaltysystems/react-ui-library';
import { SUPPORTED_LANGUAGES } from '@curveroyaltysystems/i18n';
import { Button } from '@curveroyaltysystems/react-ui-library';
import { Icon } from '@curveroyaltysystems/react-ui-library';
import { LanguageMenuItem } from './LanguageMenuItem';

export const LanguageMenu = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Select Language">
          <Icon.Globe />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LANGUAGES.map((language) => (
          <LanguageMenuItem key={language.code} language={language} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
