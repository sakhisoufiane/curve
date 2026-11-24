import { useQuery } from '@tanstack/react-query';
import { worksApi } from '@/api/works';
import { useClientStore } from '@/stores/client.store';

export const useWorkQuery = (id: string | undefined) => {
  const { clientId } = useClientStore();
  return useQuery({
    queryKey: ['work', id, clientId],
    queryFn: () => worksApi.getWork(id!),
    enabled: !!id,
  });
};
