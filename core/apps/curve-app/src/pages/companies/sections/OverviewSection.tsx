import { useFormContext } from 'react-hook-form';
import { useTranslation } from '@curveroyaltysystems/i18n';
import { Input } from '@curveroyaltysystems/react-ui-library';
import { FormSection, FormGrid, FormField, FormGridSkeleton } from '@/components/EditPageLayout';
import { type CompanyFormData } from '@/api/companies';

export function OverviewSection({ disabled, isLoading }: { disabled?: boolean; isLoading?: boolean }) {
  const { t } = useTranslation('companies');
  const {
    register,
    formState: { errors },
  } = useFormContext<CompanyFormData>();

  return (
    <FormSection title={t('edit.overview.title')}>
      {isLoading ? (
        <FormGridSkeleton cols={2} count={2} />
      ) : (
        <FormGrid cols={2}>
          <FormField label={t('edit.fields.name.label')} required error={errors.name?.message}>
            <Input {...register('name')} disabled={disabled} />
          </FormField>
          <FormField label={t('edit.fields.foreignId.label')}>
            <Input {...register('foreignId')} disabled={disabled} />
          </FormField>
        </FormGrid>
      )}
    </FormSection>
  );
}
