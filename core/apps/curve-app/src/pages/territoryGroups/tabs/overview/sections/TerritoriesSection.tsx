import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from '@curveroyaltysystems/i18n';
import { TerritoriesPicker, TerritoriesPickerSkeleton } from '@curveroyaltysystems/react-ui-library';
import { FormSection } from '@/components/EditPageLayout';
import { type TerritoryGroupFormData } from '@/api/territoryGroups';

export function TerritoriesSection({ isLoading }: { isLoading?: boolean }) {
  const { t } = useTranslation('territoryGroups');
  const { control, setValue } = useFormContext<TerritoryGroupFormData>();
  const territories = useWatch({ control, name: 'territories' }) ?? [];

  return (
    <FormSection
      title={t('edit.overview.sections.territories.title')}
      description={t('edit.overview.sections.territories.description')}
      collapsible={false}
    >
      {isLoading ? (
        <TerritoriesPickerSkeleton />
      ) : (
        <TerritoriesPicker
          value={territories}
          onChange={(codes) => setValue('territories', codes, { shouldDirty: true })}
        />
      )}
    </FormSection>
  );
}
