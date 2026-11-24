import { ValidationItem } from '@curveroyaltysystems/react-ui-library';
import { useTranslation } from '@curveroyaltysystems/i18n';
import { ExpandReveal } from '../../motion';
import { usePasswordValidation } from '@/hooks/auth/usePasswordValidation';

interface PasswordValidationChecklistProps {
  password: string;
  confirmPassword: string;
}

export const PasswordValidationChecklist = ({ password, confirmPassword }: PasswordValidationChecklistProps) => {
  const { t } = useTranslation();
  const { showValidation, validationStatus } = usePasswordValidation(password, confirmPassword);

  if (!showValidation) return null;

  return (
    <ExpandReveal className="space-y-2 p-3 bg-muted/50 rounded-md">
      <p className="text-sm font-medium text-muted-foreground mb-2">
        {t('authentication:signUp.passwordRequirements.title')}
      </p>
      {validationStatus.map((requirement) => (
        <ValidationItem key={requirement.id} isValid={requirement.isValid}>
          {requirement.label}
        </ValidationItem>
      ))}
    </ExpandReveal>
  );
};
