import { useQuery } from '@tanstack/react-query';
import { clientApi } from '@/api/client';
import { useClientStore } from '@/stores/client.store';

export const useClientSettingsQuery = () => {
  const clientId = useClientStore((s) => s.clientId);

  return useQuery({
    queryKey: ['client', clientId],
    queryFn: () => clientApi.getClient(clientId!),
    enabled: !!clientId,
  });
};
