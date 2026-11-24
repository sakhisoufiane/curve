import { useQuery } from '@tanstack/react-query';
import { territoryGroupsApi } from '@/api/territoryGroups';
import { useClientStore } from '@/stores/client.store';

export const useTerritoryGroupQuery = (id: string | undefined) => {
  const { clientId } = useClientStore();
  return useQuery({
    queryKey: ['territoryGroup', id, clientId],
    queryFn: () => territoryGroupsApi.getTerritoryGroup(id!),
    enabled: !!id,
  });
};
