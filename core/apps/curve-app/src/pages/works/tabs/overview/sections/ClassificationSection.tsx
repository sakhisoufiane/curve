import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from '@curveroyaltysystems/i18n';
import {
  EditableObjectList,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@curveroyaltysystems/react-ui-library';
import { FormSection, FormGrid, FormField, FormGridSkeleton } from '@/components/EditPageLayout';
import { type WorkFormData } from '@/api/works';
import { LANGUAGES } from '@/constants/languages';
import { CATEGORIES, COMPOSITE_TYPES, getOptionLabel } from '../../../utils/works.constants';
import { getCompositeWorkColumns } from '../overview.columns';
import { type CompositeWorkRow } from '../overview.rows';

export function ClassificationSection({ isLoading }: { isLoading?: boolean }) {
  const { t } = useTranslation('works');
  const { setValue, control } = useFormContext<WorkFormData>();

  const workLanguage = useWatch({ control, name: 'workLanguage' }) ?? '';
  const workDescriptionCategory = useWatch({ control, name: 'workDescriptionCategory' }) ?? '';
  const compositeType = useWatch({ control, name: 'compositeType' }) ?? '';
  const compositeWorks = useWatch({ control, name: 'compositeWorks' }) ?? [];

  return (
    <FormSection
      title={t('edit.overview.sections.classification.title')}
      description={t('edit.overview.sections.classification.description')}
    >
      {isLoading ? (
        <FormGridSkeleton cols={2} count={2} />
      ) : (
        <>
          <FormGrid cols={2}>
            <FormField label={t('edit.overview.fields.category.label')}>
              <Select
                value={workDescriptionCategory}
                onValueChange={(v) => setValue('workDescriptionCategory', v, { shouldDirty: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('edit.overview.fields.category.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {getOptionLabel(t, 'category', v)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label={t('edit.overview.fields.language.label')}>
              <Select value={workLanguage} onValueChange={(v) => setValue('workLanguage', v, { shouldDirty: true })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('edit.overview.fields.language.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </FormGrid>

          <FormField label={t('edit.overview.fields.compositeType.label')}>
            <Select value={compositeType} onValueChange={(v) => setValue('compositeType', v, { shouldDirty: true })}>
              <SelectTrigger>
                <SelectValue placeholder={t('edit.overview.fields.compositeType.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {COMPOSITE_TYPES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {getOptionLabel(t, 'compositeType', v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {compositeType && compositeType !== 'None' && (
            <FormField label={t('edit.overview.fields.compositeWorks.label')}>
              <EditableObjectList<CompositeWorkRow>
                bare
                itemLabel={t('edit.overview.lists.compositeWork.itemLabel')}
                columns={getCompositeWorkColumns(t)}
                value={compositeWorks}
                onChange={(rows) => setValue('compositeWorks', rows, { shouldDirty: true })}
              />
            </FormField>
          )}
        </>
      )}
    </FormSection>
  );
}
