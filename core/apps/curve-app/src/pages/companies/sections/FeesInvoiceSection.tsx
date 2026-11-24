import { useFormContext } from 'react-hook-form';
import { useTranslation } from '@curveroyaltysystems/i18n';
import { Textarea } from '@curveroyaltysystems/react-ui-library';
import { FormSection, FormField, FormGridSkeleton } from '@/components/EditPageLayout';
import { type CompanyFormData } from '@/api/companies';

export function FeesInvoiceSection({ disabled, isLoading }: { disabled?: boolean; isLoading?: boolean }) {
  const { t } = useTranslation('companies');
  const { register } = useFormContext<CompanyFormData>();

  return (
    <FormSection title={t('edit.feesInvoice.title')}>
      {isLoading ? (
        <FormGridSkeleton cols={2} count={1} />
      ) : (
        <FormField label={t('edit.fields.feesInvoiceCustomText.label')} hint={t('edit.fields.feesInvoiceCustomText.hint')}>
          <Textarea {...register('feesInvoiceCustomText')} disabled={disabled} />
        </FormField>
      )}
    </FormSection>
  );
}
