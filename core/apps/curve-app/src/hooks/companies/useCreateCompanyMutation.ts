import { useMutation, useQueryClient } from '@tanstack/react-query';
import { companiesApi, type CompanyFormData } from '@/api/companies';

export const useCreateCompanyMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CompanyFormData) => companiesApi.createCompany(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
};
