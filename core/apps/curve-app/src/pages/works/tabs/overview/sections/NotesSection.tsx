import { useFormContext } from 'react-hook-form';
import { useTranslation } from '@curveroyaltysystems/i18n';
import { Skeleton, Textarea } from '@curveroyaltysystems/react-ui-library';
import { FormSection } from '@/components/EditPageLayout';
import { type WorkFormData } from '@/api/works';

export function NotesSection({ isLoading }: { isLoading?: boolean }) {
  const { t } = useTranslation('works');
  const { register } = useFormContext<WorkFormData>();

  return (
    <FormSection title={t('edit.overview.sections.notes.title')}>
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <Textarea {...register('notes')} placeholder={t('edit.overview.fields.notes.placeholder')} rows={4} />
      )}
    </FormSection>
  );
}
