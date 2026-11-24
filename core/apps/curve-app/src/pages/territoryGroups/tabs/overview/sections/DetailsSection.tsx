import { useFormContext } from 'react-hook-form';
import { useTranslation } from '@curveroyaltysystems/i18n';
import { Input } from '@curveroyaltysystems/react-ui-library';
import { FormSection, FormField, FormGridSkeleton } from '@/components/EditPageLayout';
import { type TerritoryGroupFormData } from '@/api/territoryGroups';

export function DetailsSection({ isLoading }: { isLoading?: boolean }) {
  const { t } = useTranslation('territoryGroups');
  const {
    register,
    formState: { errors },
  } = useFormContext<TerritoryGroupFormData>();

  return (
    <FormSection
      title={t('edit.overview.sections.details.title')}
      description={t('edit.overview.sections.details.description')}
    >
      {isLoading ? (
        <FormGridSkeleton cols={2} count={1} />
      ) : (
        <FormField label={t('edit.overview.fields.name.label')} required error={errors.name?.message}>
          <Input
            {...register('name', { required: t('edit.overview.fields.name.required') })}
            placeholder={t('edit.overview.fields.name.placeholder')}
          />
        </FormField>
      )}
    </FormSection>
  );
}
