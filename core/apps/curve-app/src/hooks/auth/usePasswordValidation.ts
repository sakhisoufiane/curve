import { useMemo } from 'react';
import { useTranslation } from '@curveroyaltysystems/i18n';
import { doPasswordsMatch, getPasswordRequirements, getPasswordsMatchRequirement } from '@/components/Authentication/utils';

export const usePasswordValidation = (password: string, confirmPassword: string) => {
  const { t } = useTranslation();
  const showValidation = password.length > 0 || confirmPassword.length > 0;

  const validationStatus = useMemo(() => {
    const requirements = getPasswordRequirements(t).map((req) => ({
      ...req,
      isValid: req.test?.(password) ?? false,
    }));

    return [
      ...requirements,
      {
        ...getPasswordsMatchRequirement(t),
        isValid: doPasswordsMatch(password, confirmPassword),
      },
    ];
  }, [password, confirmPassword, t]);

  return { showValidation, validationStatus };
};
