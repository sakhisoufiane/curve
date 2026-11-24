import { useQuery } from '@tanstack/react-query';
import { companiesApi, type CompaniesQueryParams } from '@/api/companies';
import { useClientStore } from '@/stores/client.store';

export const useCompaniesQuery = (params: CompaniesQueryParams) => {
  const { clientId } = useClientStore();
  return useQuery({
    queryKey: ['companies', params, clientId],
    queryFn: () => companiesApi.getCompanies(params),
  });
};
