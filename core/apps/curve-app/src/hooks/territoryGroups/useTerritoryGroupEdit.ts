import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from '@curveroyaltysystems/i18n';
import { showToast } from '@curveroyaltysystems/react-ui-library';
import { useBreadcrumbs } from '@/hooks/utils/useBreadcrumbs';
import { useTerritoryGroupQuery } from '@/hooks/territoryGroups/useTerritoryGroupQuery';
import { useCreateTerritoryGroupMutation } from '@/hooks/territoryGroups/useCreateTerritoryGroupMutation';
import { useUpdateTerritoryGroupMutation } from '@/hooks/territoryGroups/useUpdateTerritoryGroupMutation';
import { useDeleteTerritoryGroupMutation } from '@/hooks/territoryGroups/useDeleteTerritoryGroupMutation';
import { type TerritoryGroupFormData } from '@/api/territoryGroups';
import { emptyTerritoryGroupFormValues, territoryGroupToFormValues } from '@/pages/territoryGroups/utils/territoryGroups.mapper';

/** Orchestrates the territory group create/edit page: form, queries, mutations and delete flow. */
export function useTerritoryGroupEdit() {
  const { t } = useTranslation('territoryGroups');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;

  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: group, isLoading } = useTerritoryGroupQuery(id);
  const { mutate: createGroup, isPending: isCreating } = useCreateTerritoryGroupMutation();
  const { mutate: updateGroup, isPending: isUpdating } = useUpdateTerritoryGroupMutation();
  const { mutateAsync: deleteGroup } = useDeleteTerritoryGroupMutation();

  const form = useForm<TerritoryGroupFormData>({
    defaultValues: emptyTerritoryGroupFormValues,
    // Syncs form values with the loaded group whenever it changes.
    values: group ? territoryGroupToFormValues(group) : undefined,
  });

  function onSubmit(values: TerritoryGroupFormData) {
    if (isNew) {
      createGroup(values, {
        onSuccess: (g) => {
          showToast({ type: 'success', title: t('edit.createdToast') });
          navigate(`/territoryGroups/${g._id}/edit`);
        },
      });
    } else {
      updateGroup(
        { id: id!, data: values },
        { onSuccess: () => showToast({ type: 'success', title: t('edit.savedToast') }) }
      );
    }
  }

  async function handleDelete() {
    await deleteGroup(id!);
    showToast({ type: 'success', title: t('deleteToast') });
    navigate('/territoryGroups');
  }

  useBreadcrumbs([
    { label: t('title'), href: '/territoryGroups' },
    { label: isNew ? t('edit.newGroup') : (group?.name ?? ''), isLoading: !isNew && isLoading },
  ]);

  const isSaving = isCreating || isUpdating;

  return {
    form,
    submit: form.handleSubmit(onSubmit),
    isNew,
    isLoading,
    isSaving,
    group,
    deleteOpen,
    setDeleteOpen,
    handleDelete,
  };
}
