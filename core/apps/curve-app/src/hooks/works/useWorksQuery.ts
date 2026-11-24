import { useQuery } from '@tanstack/react-query';
import { worksApi, type WorksParams } from '@/api/works';
import { useClientStore } from '@/stores/client.store';

export const useWorksQuery = (params: WorksParams) => {
  const { clientId } = useClientStore();
  return useQuery({
    queryKey: ['works', params, clientId],
    queryFn: () => worksApi.getWorks(params),
    placeholderData: (prev) => prev,
  });
};
