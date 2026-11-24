import { useQuery } from '@tanstack/react-query';
import { territoryGroupsApi, type TerritoryGroupsParams } from '@/api/territoryGroups';
import { useClientStore } from '@/stores/client.store';

export const useTerritoryGroupsQuery = (params: TerritoryGroupsParams) => {
  const { clientId } = useClientStore();
  return useQuery({
    queryKey: ['territoryGroups', params, clientId],
    queryFn: () => territoryGroupsApi.getTerritoryGroups(params),
  });
};
