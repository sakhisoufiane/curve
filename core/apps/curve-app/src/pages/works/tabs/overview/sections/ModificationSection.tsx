import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from '@curveroyaltysystems/i18n';
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@curveroyaltysystems/react-ui-library';
import { FormSection, FormGrid, FormField, FormGridSkeleton } from '@/components/EditPageLayout';
import { type WorkFormData } from '@/api/works';
import { VERSION_TYPES, ARRANGEMENT_TYPES, LYRIC_ADAPTION_TYPES, getOptionLabel } from '../../../utils/works.constants';

export function ModificationSection({ isLoading }: { isLoading?: boolean }) {
  const { t } = useTranslation('works');
  const { register, setValue, control } = useFormContext<WorkFormData>();

  const versionType = useWatch({ control, name: 'versionType' }) ?? '';
  const arrangementType = useWatch({ control, name: 'arrangementType' }) ?? '';
  const lyricAdaptionType = useWatch({ control, name: 'lyricAdaptionType' }) ?? '';

  return (
    <FormSection
      title={t('edit.overview.sections.modification.title')}
      description={t('edit.overview.sections.modification.description')}
    >
      {isLoading ? (
        <FormGridSkeleton cols={2} count={2} />
      ) : (
        <>
          <FormField label={t('edit.overview.fields.workVersion.label')} hint={t('edit.overview.fields.workVersion.hint')}>
            <Select value={versionType} onValueChange={(v) => setValue('versionType', v, { shouldDirty: true })}>
              <SelectTrigger>
                <SelectValue placeholder={t('edit.overview.fields.workVersion.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {VERSION_TYPES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {getOptionLabel(t, 'versionType', v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {versionType === 'Modification' && (
            <>
              <FormGrid cols={2}>
                <FormField label={t('edit.overview.fields.arrangementType.label')} hint={t('edit.overview.fields.arrangementType.hint')}>
                  <Select
                    value={arrangementType}
                    onValueChange={(v) => setValue('arrangementType', v, { shouldDirty: true })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('edit.overview.fields.arrangementType.placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {ARRANGEMENT_TYPES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {getOptionLabel(t, 'arrangementType', v)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label={t('edit.overview.fields.lyricAdaption.label')} hint={t('edit.overview.fields.lyricAdaption.hint')}>
                  <Select
                    value={lyricAdaptionType}
                    onValueChange={(v) => setValue('lyricAdaptionType', v, { shouldDirty: true })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('edit.overview.fields.lyricAdaption.placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {LYRIC_ADAPTION_TYPES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {getOptionLabel(t, 'lyricAdaptionType', v)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </FormGrid>
              <FormGrid cols={2}>
                <FormField label={t('edit.overview.fields.originalWorkTitle.label')} hint={t('edit.overview.fields.originalWorkTitle.hint')}>
                  <Input {...register('originalWorkTitle')} placeholder={t('edit.overview.fields.originalWorkTitle.placeholder')} />
                </FormField>
                <FormField label={t('edit.overview.fields.originalIswc.label')}>
                  <Input {...register('originalIswc')} placeholder={t('edit.overview.fields.originalIswc.placeholder')} />
                </FormField>
              </FormGrid>
              <FormField label={t('edit.overview.fields.originalWorkSource.label')} hint={t('edit.overview.fields.originalWorkSource.hint')}>
                <Input {...register('originalWorkSource')} placeholder={t('edit.overview.fields.originalWorkSource.placeholder')} />
              </FormField>
              <FormGrid cols={2}>
                <FormField label={t('edit.overview.fields.originalWriterFirstName.label')}>
                  <Input {...register('originalWorkWriterFirstName')} placeholder={t('edit.overview.fields.originalWriterFirstName.placeholder')} />
                </FormField>
                <FormField label={t('edit.overview.fields.originalWriterLastName.label')}>
                  <Input {...register('originalWorkWriterLastName')} placeholder={t('edit.overview.fields.originalWriterLastName.placeholder')} />
                </FormField>
              </FormGrid>
            </>
          )}
        </>
      )}
    </FormSection>
  );
}
