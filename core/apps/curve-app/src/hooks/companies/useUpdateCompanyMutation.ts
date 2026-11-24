import { useMutation, useQueryClient } from '@tanstack/react-query';
import { companiesApi, type CompanyFormData } from '@/api/companies';

export const useUpdateCompanyMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CompanyFormData> }) => companiesApi.updateCompany(id, data),
    onSuccess: (company) => {
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
      // Refetch the detail query (prefix-matches ['company', id, clientId] in useCompanyQuery)
      // so the page reflects the authoritative server doc, including publicLogo.
      void queryClient.invalidateQueries({ queryKey: ['company', company._id] });
    },
  });
};
