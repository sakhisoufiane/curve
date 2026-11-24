import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from '@curveroyaltysystems/i18n';
import { CheckboxField, Input } from '@curveroyaltysystems/react-ui-library';
import { FormSection, FormGrid, FormField, FormGridSkeleton } from '@/components/EditPageLayout';
import { type WorkFormData } from '@/api/works';

export function ConfigurationSection({ isLoading }: { isLoading?: boolean }) {
  const { t } = useTranslation('works');
  const { register, setValue, control } = useFormContext<WorkFormData>();

  const priority = useWatch({ control, name: 'priority' }) ?? false;
  const productionLibrary = useWatch({ control, name: 'productionLibrary' }) ?? false;

  return (
    <FormSection
      title={t('edit.overview.sections.configuration.title')}
      description={t('edit.overview.sections.configuration.description')}
    >
      {isLoading ? (
        <FormGridSkeleton cols={2} count={2} />
      ) : (
        <>
          <div className="space-y-3">
            <CheckboxField
              id="priority"
              label={t('edit.overview.fields.priority.label')}
              description={t('edit.overview.fields.priority.description')}
              checked={!!priority}
              onCheckedChange={(v) => setValue('priority', v, { shouldDirty: true })}
            />
            <CheckboxField
              id="productionLibrary"
              label={t('edit.overview.fields.productionLibrary.label')}
              description={t('edit.overview.fields.productionLibrary.description')}
              checked={!!productionLibrary}
              onCheckedChange={(v) => setValue('productionLibrary', v, { shouldDirty: true })}
            />
          </div>

          {productionLibrary && (
            <FormGrid cols={2}>
              <FormField label={t('edit.overview.fields.productionTitle.label')}>
                <Input {...register('productionTitle')} placeholder={t('edit.overview.fields.productionTitle.placeholder')} />
              </FormField>
              <FormField label={t('edit.overview.fields.cdIdentifier.label')}>
                <Input {...register('cdIdentifier')} placeholder={t('edit.overview.fields.cdIdentifier.placeholder')} />
              </FormField>
              <FormField label={t('edit.overview.fields.cutNo.label')}>
                <Input {...register('cutNo')} placeholder={t('edit.overview.fields.cutNo.placeholder')} />
              </FormField>
              <FormField label={t('edit.overview.fields.libraryTitle.label')}>
                <Input {...register('libraryTitle')} placeholder={t('edit.overview.fields.libraryTitle.placeholder')} />
              </FormField>
            </FormGrid>
          )}
        </>
      )}
    </FormSection>
  );
}
