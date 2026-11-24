import { useQuery } from '@tanstack/react-query';
import { companiesApi } from '@/api/companies';
import { useClientStore } from '@/stores/client.store';

export const useCompanyQuery = (id: string | undefined) => {
  const { clientId } = useClientStore();
  return useQuery({
    queryKey: ['company', id, clientId],
    queryFn: () => companiesApi.getCompany(id!),
    enabled: !!id,
  });
};
