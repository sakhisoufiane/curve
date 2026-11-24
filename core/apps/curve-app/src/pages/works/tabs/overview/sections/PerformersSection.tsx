import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from '@curveroyaltysystems/i18n';
import { EditableObjectList } from '@curveroyaltysystems/react-ui-library';
import { FormSection, FormGridSkeleton } from '@/components/EditPageLayout';
import { type WorkFormData } from '@/api/works';
import { getPerformerColumns } from '../overview.columns';
import { type PerformerRow } from '../overview.rows';

export function PerformersSection({ isLoading }: { isLoading?: boolean }) {
  const { t } = useTranslation('works');
  const { setValue, control } = useFormContext<WorkFormData>();

  const performers = useWatch({ control, name: 'performers' }) ?? [];

  return (
    <FormSection
      title={t('edit.overview.sections.performers.title')}
      description={t('edit.overview.sections.performers.description')}
    >
      {isLoading ? (
        <FormGridSkeleton cols={2} count={2} />
      ) : (
        <EditableObjectList<PerformerRow>
          bare
          itemLabel={t('edit.overview.lists.performer.itemLabel')}
          columns={getPerformerColumns(t)}
          value={performers}
          onChange={(rows) => setValue('performers', rows, { shouldDirty: true })}
        />
      )}
    </FormSection>
  );
}
