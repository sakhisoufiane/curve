import { useMutation, useQueryClient } from '@tanstack/react-query';
import { companiesApi } from '@/api/companies';

export const useUploadCompanyLogoMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => companiesApi.uploadCompanyLogo(id, file),
    onSuccess: (company) => {
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
      // Refetch the detail query rather than caching the upload response: that response
      // doesn't carry a populated publicLogo (only GET /companies/:id does), so writing it
      // would blank out the logo. Prefix-matches ['company', id, clientId] in useCompanyQuery.
      void queryClient.invalidateQueries({ queryKey: ['company', company._id] });
    },
  });
};
