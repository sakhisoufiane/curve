import { useTranslation } from '@curveroyaltysystems/i18n';
import { FileDrop, showToast } from '@curveroyaltysystems/react-ui-library';
import { FormSection, FormField, FormGrid, FormGridSkeleton } from '@/components/EditPageLayout';
import { validateLogoFile } from '../utils/companies.logo';

interface LogoSectionProps {
  publicLogo?: string;
  logoFile: File | null;
  onLogoChange: (file: File | null) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function LogoSection({ publicLogo, logoFile, onLogoChange, disabled, isLoading }: LogoSectionProps) {
  const { t } = useTranslation('companies');

  async function handleChange(file: File | null) {
    if (!file) {
      onLogoChange(null);
      return;
    }

    const result = await validateLogoFile(file);
    if (!result.ok) {
      showToast({ type: 'error', title: t(`edit.logo.errors.${result.reason}`) });
      return;
    }

    onLogoChange(file);
  }

  return (
    <FormSection title={t('edit.logo.title')}>
      {isLoading ? (
        <FormGridSkeleton cols={2} count={1} />
      ) : (
        <FormGrid>
          {publicLogo && !logoFile && (
            <div className="flex justify-center rounded-lg border bg-muted/30 p-4">
              <img src={publicLogo} alt={t('edit.logo.title')} className="max-h-32 object-contain" />
            </div>
          )}
          {!disabled && (
            <FormField label={t('edit.logo.uploadLabel')} hint={t('edit.logo.hint')}>
              <FileDrop value={logoFile} onChange={(f) => void handleChange(f)} accept="image/*" />
            </FormField>
          )}
        </FormGrid>
      )}
    </FormSection>
  );
}
