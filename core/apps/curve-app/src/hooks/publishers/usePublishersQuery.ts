import { useQuery } from '@tanstack/react-query';
import { publishersApi, type PublisherParams } from '@/api/publishers';
import { useClientStore } from '@/stores/client.store';

export const usePublishersQuery = (params: PublisherParams) => {
  const { clientId } = useClientStore();
  return useQuery({
    queryKey: ['publishers', params, clientId],
    queryFn: () => publishersApi.getPublishers(params),
    placeholderData: (prev) => prev,
  });
};
