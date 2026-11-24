import { useQuery } from '@tanstack/react-query';
import { composersApi, type ComposerParams } from '@/api/composers';
import { useClientStore } from '@/stores/client.store';

export const useComposersQuery = (params: ComposerParams) => {
  const { clientId } = useClientStore();
  return useQuery({
    queryKey: ['composers', params, clientId],
    queryFn: () => composersApi.getComposers(params),
    placeholderData: (prev) => prev,
  });
};
