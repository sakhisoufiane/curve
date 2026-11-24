import { useQuery } from '@tanstack/react-query';
import { contractsApi, type ContractParams } from '@/api/contracts';
import { useClientStore } from '@/stores/client.store';

export const useContractsQuery = (params: ContractParams) => {
  const { clientId } = useClientStore();
  return useQuery({
    queryKey: ['contracts', params, clientId],
    queryFn: () => contractsApi.getContracts(params),
    placeholderData: (prev) => prev,
  });
};
