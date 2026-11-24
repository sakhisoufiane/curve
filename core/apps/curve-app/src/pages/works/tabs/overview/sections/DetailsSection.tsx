import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from '@curveroyaltysystems/i18n';
import { Button, EditableObjectList, Icon, Input } from '@curveroyaltysystems/react-ui-library';
import { FormSection, FormGrid, FormField, FormGridSkeleton } from '@/components/EditPageLayout';
import { type Work, type WorkFormData } from '@/api/works';
import { getAlternateTitleColumns } from '../overview.columns';
import { type AlternateTitleRow, toAltTitleRows, fromAltTitleRows } from '../overview.rows';

export function DetailsSection({ work, isLoading }: { work?: Work; isLoading?: boolean }) {
  const { t } = useTranslation('works');
  const {
    register,
    setValue,
    control,
    formState: { errors },
  } = useFormContext<WorkFormData>();

  const alternateTitles = useWatch({ control, name: 'alternateTitles' }) ?? [];

  return (
    <FormSection
      title={t('edit.overview.sections.details.title')}
      description={t('edit.overview.sections.details.description')}
    >
      {isLoading ? (
        <FormGridSkeleton cols={2} count={8} />
      ) : (
        <>
          <FormGrid cols={2}>
            <FormField label={t('edit.overview.fields.title.label')} required error={errors.title?.message}>
              <Input {...register('title')} placeholder={t('edit.overview.fields.title.placeholder')} />
            </FormField>
            <FormField label={t('edit.overview.fields.partyId.label')} hint={t('edit.overview.fields.partyId.hint')}>
              <Input value={work?.partyNo ?? ''} disabled readOnly />
            </FormField>
          </FormGrid>

          <FormField label={t('edit.overview.fields.alternateTitles.label')}>
            <EditableObjectList<AlternateTitleRow>
              bare
              itemLabel={t('edit.overview.lists.alternateTitle.itemLabel')}
              columns={getAlternateTitleColumns(t)}
              value={toAltTitleRows(alternateTitles)}
              onChange={(rows) => setValue('alternateTitles', fromAltTitleRows(rows), { shouldDirty: true })}
            />
          </FormField>

          <FormField label={t('edit.overview.fields.composer.label')}>
            <Input {...register('composer')} placeholder={t('edit.overview.fields.composer.placeholder')} />
          </FormField>
          <FormGrid cols={2}>
            <FormField label={t('edit.overview.fields.foreignId.label')} hint={t('edit.overview.fields.foreignId.hint')}>
              <Input {...register('foreignId')} placeholder={t('edit.overview.fields.foreignId.placeholder')} />
            </FormField>
            <FormField label={t('edit.overview.fields.projectId.label')}>
              <Input {...register('projectId')} placeholder={t('edit.overview.fields.projectId.placeholder')} />
            </FormField>
          </FormGrid>
          <FormGrid cols={2}>
            <FormField label={t('edit.overview.fields.identifier.label')}>
              <Input {...register('identifier')} placeholder={t('edit.overview.fields.identifier.placeholder')} />
            </FormField>
            <FormField label={t('edit.overview.fields.iswc.label')}>
              <Input {...register('iswc')} placeholder={t('edit.overview.fields.iswc.placeholder')} />
            </FormField>
          </FormGrid>
          <FormGrid cols={2}>
            <FormField label={t('edit.overview.fields.tunecode.label')}>
              <Input {...register('tunecode')} placeholder={t('edit.overview.fields.tunecode.placeholder')} />
            </FormField>
            <FormField label={t('edit.overview.fields.copyrightDate.label')} hint={t('edit.overview.fields.copyrightDate.hint')}>
              <Input type="date" {...register('copyrightDate')} />
            </FormField>
          </FormGrid>
          <FormField label={t('edit.overview.fields.labelCopy.label')} hint={t('edit.overview.fields.labelCopy.hint')}>
            <Input {...register('labelCopy')} placeholder={t('edit.overview.fields.labelCopy.placeholder')} />
          </FormField>

          <FormField label={t('edit.overview.fields.source.label')} hint={t('edit.overview.fields.source.hint')}>
            <div>
              <Button type="button" variant="outline" size="sm" disabled={!work?.source?.length} className="gap-1.5">
                <Icon.FileText className="size-3.5" />
                {t('edit.overview.fields.source.button')}
              </Button>
            </div>
          </FormField>
        </>
      )}
    </FormSection>
  );
}
