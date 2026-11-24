import { useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@curveroyaltysystems/react-ui-library';
import { useTranslation } from '@curveroyaltysystems/i18n';
import { companiesApi } from '@/api/companies';

export function useDeleteCompanyMutation() {
  const { t } = useTranslation('companies');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map((id) => companiesApi.deleteCompany(id))),
    onSuccess: (_data, ids) => {
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
      showToast({
        type: 'success',
        title: t('deleteToast.successTitle', { count: ids.length }),
      });
    },
    onError: () => {
      showToast({
        type: 'error',
        title: t('deleteToast.errorTitle'),
        description: t('deleteToast.errorDescription'),
      });
    },
  });
}
