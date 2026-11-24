import { DropdownMenuItem } from '@curveroyaltysystems/react-ui-library';
import { type LanguageOption } from '@curveroyaltysystems/i18n';
import { useCallback } from 'react';
import { i18n } from '@curveroyaltysystems/i18n';

interface LanguageMenuItemProps {
  language: LanguageOption;
}

export const LanguageMenuItem = ({ language }: LanguageMenuItemProps) => {
  const handleLanguageChange = useCallback((languageCode: string) => {
    i18n.changeLanguage(languageCode);
  }, []);
  return (
    <DropdownMenuItem
      key={language.code}
      onClick={() => handleLanguageChange(language.code)}
      className="cursor-pointer"
    >
      <span className="mr-2">{language.flag}</span>
      <span>{language.code.toUpperCase()}</span>
    </DropdownMenuItem>
  );
};
