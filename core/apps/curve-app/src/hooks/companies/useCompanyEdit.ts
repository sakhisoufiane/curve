import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@curveroyaltysystems/i18n';
import { showToast } from '@curveroyaltysystems/react-ui-library';
import { useBreadcrumbs } from '@/hooks/utils/useBreadcrumbs';
import { useCompanyQuery } from '@/hooks/companies/useCompanyQuery';
import { useCreateCompanyMutation } from '@/hooks/companies/useCreateCompanyMutation';
import { useUpdateCompanyMutation } from '@/hooks/companies/useUpdateCompanyMutation';
import { useUploadCompanyLogoMutation } from '@/hooks/companies/useUploadCompanyLogoMutation';
import { useDeleteCompanyMutation } from '@/hooks/companies/useDeleteCompanyMutation';
import { useClientStore } from '@/stores/client.store';
import { type CompanyFormData } from '@/api/companies';
import { companySchema } from '@/pages/companies/utils/companies.schema';
import { companyToFormValues, emptyCompanyFormValues } from '@/pages/companies/utils/companies.mapper';

/** Orchestrates the company create/edit page: permissions, form, queries, mutations, logo upload and delete. */
export function useCompanyEdit() {
  const { t } = useTranslation('companies');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const isNew = !id;

  const contractsRight = useClientStore((s) => s.clientRights?.contracts);
  const canEdit = contractsRight === 'Edit';

  // Mirrors the Angular guard: no contracts access → bounce to the dashboard.
  useEffect(() => {
    if (contractsRight === 'None') {
      navigate('/', { replace: true });
    }
  }, [contractsRight, navigate]);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const { data: company, isLoading } = useCompanyQuery(id);
  const { mutateAsync: createCompany, isPending: isCreating } = useCreateCompanyMutation();
  const { mutateAsync: updateCompany, isPending: isUpdating } = useUpdateCompanyMutation();
  const { mutateAsync: uploadLogo, isPending: isUploading } = useUploadCompanyLogoMutation();
  const { mutateAsync: deleteCompanies } = useDeleteCompanyMutation();

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: emptyCompanyFormValues,
    values: company ? companyToFormValues(company) : undefined,
  });

  async function onSubmit(values: CompanyFormData) {
    try {
      if (isNew) {
        const created = await createCompany(values);
        if (logoFile) {
          await uploadLogo({ id: created._id, file: logoFile });
          setLogoFile(null);
        }
        showToast({ type: 'success', title: t('edit.toast.created') });
        navigate(`/companies/${created._id}/edit`);
      } else {
        await updateCompany({ id: id!, data: values });
        if (logoFile) {
          await uploadLogo({ id: id!, file: logoFile });
          setLogoFile(null);
        }
        showToast({ type: 'success', title: t('edit.toast.saved') });
      }
    } catch (err) {
      // Surface the API message (e.g. "Name is required to be unique") when present.
      showToast({
        type: 'error',
        title: t('edit.toast.error'),
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function handleDelete() {
    await deleteCompanies([id!]);
    setDeleteOpen(false);
    navigate('/companies');
  }

  const isSaving = isCreating || isUpdating || isUploading;

  useBreadcrumbs([
    { label: t('title'), href: '/companies' },
    { label: isNew ? t('edit.create') : (company?.name ?? ''), isLoading: !isNew && isLoading },
  ]);

  return {
    form,
    submit: form.handleSubmit(onSubmit),
    isNew,
    canEdit,
    isLoading,
    isSaving,
    company,
    logoFile,
    setLogoFile,
    deleteOpen,
    setDeleteOpen,
    handleDelete,
  };
}
