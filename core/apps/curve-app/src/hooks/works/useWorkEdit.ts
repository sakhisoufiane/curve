import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@curveroyaltysystems/i18n';
import { showToast } from '@curveroyaltysystems/react-ui-library';
import { filterTabs, resolveTabsForHeader, type TabContext } from '@/components/EditPageLayout';
import { useWorkQuery } from '@/hooks/works/useWorkQuery';
import { useCreateWorkMutation } from '@/hooks/works/useCreateWorkMutation';
import { useUpdateWorkMutation } from '@/hooks/works/useUpdateWorkMutation';
import { useDeleteWorkMutation } from '@/hooks/works/useDeleteWorkMutation';
import { useBreadcrumbs } from '@/hooks/utils/useBreadcrumbs';
import { useHeaderTabs } from '@/hooks/utils/useHeaderTabs';
import { type WorkFormData } from '@/api/works';
import { emptyWorkFormValues, getWorkStatus, workToFormValues, type WorkStatus } from '@/pages/works/utils/works.mapper';
import { workSchema } from '@/pages/works/utils/works.schema';
import { type TabId, DEFAULT_TAB } from '@/pages/works/utils/works.constants';
import { getWorkTabs } from '@/pages/works/utils/works.tabs';

/** Orchestrates the work create/edit page: form, queries, mutations, status, tabs and delete flow. */
export function useWorkEdit() {
  const { t } = useTranslation('works');
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isNew = !id;

  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: work, isLoading } = useWorkQuery(id);
  const { mutate: createWork, isPending: isCreating } = useCreateWorkMutation();
  const { mutate: updateWork, isPending: isUpdating } = useUpdateWorkMutation();
  const { mutateAsync: deleteWork } = useDeleteWorkMutation();

  const form = useForm<WorkFormData>({
    resolver: zodResolver(workSchema),
    defaultValues: emptyWorkFormValues,
    // Syncs form values with the loaded work whenever it changes.
    // workToFormValues handles the copyrightDate format and null normalisation.
    values: work ? workToFormValues(work) : undefined,
  });

  function onSubmit(values: WorkFormData) {
    if (isNew) {
      createWork(values, {
        onSuccess: (w) => {
          showToast({ type: 'success', title: t('edit.createdToast') });
          navigate(`/works/${w._id}/edit`);
        },
      });
    } else {
      updateWork(
        { id: id!, data: values },
        {
          onSuccess: () => showToast({ type: 'success', title: t('edit.savedToast') }),
        }
      );
    }
  }

  async function handleDelete() {
    await deleteWork({ id: id! });
    navigate('/works');
  }

  const workStatus: WorkStatus | undefined = work ? getWorkStatus(work) : isNew ? 'invalid' : undefined;
  const isOnHold = workStatus === 'approvedOnHold';
  const isSaving = isCreating || isUpdating;

  const tabCtx: TabContext = { isNew };
  const tabs = getWorkTabs(t, { work, isNew, isLoading });
  const visibleTabs = filterTabs(tabs, tabCtx);
  const headerTabs = resolveTabsForHeader(tabs, tabCtx);
  const rawTab = searchParams.get('tab') ?? DEFAULT_TAB;
  const activeTab = (headerTabs.some((tab) => tab.id === rawTab) ? rawTab : DEFAULT_TAB) as TabId;

  useBreadcrumbs([
    { label: t('title'), href: '/works' },
    { label: isNew ? t('edit.newWork') : (work?.title ?? ''), isLoading: !isNew && isLoading },
  ]);
  useHeaderTabs(headerTabs);

  return {
    form,
    submit: form.handleSubmit(onSubmit),
    isNew,
    isLoading,
    isSaving,
    work,
    workStatus,
    isOnHold,
    visibleTabs,
    activeTab,
    deleteOpen,
    setDeleteOpen,
    handleDelete,
  };
}
