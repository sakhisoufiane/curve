import { useQuery } from '@tanstack/react-query';
import { parentsApi, type ParentQueryParams } from '@/api/parents';
import { useClientStore } from '@/stores/client.store';

export const useParentsQuery = (params: ParentQueryParams) => {
  const { clientId } = useClientStore();
  return useQuery({
    queryKey: ['parents', params, clientId],
    queryFn: () => parentsApi.getParents(params),
  });
};
