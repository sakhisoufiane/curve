import { useQuery } from '@tanstack/react-query';
import { clientApi, type ClientsQueryParams } from '@/api/client';
import { useClientStore } from '@/stores/client.store';

export const useClientsQuery = (params: ClientsQueryParams) => {
  const { clientId } = useClientStore();
  return useQuery({
    queryKey: ['clients', params, clientId],
    queryFn: () => clientApi.getClients(params),
  });
};
