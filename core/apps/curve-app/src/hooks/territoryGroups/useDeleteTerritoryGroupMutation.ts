import { useMutation, useQueryClient } from '@tanstack/react-query';
import { territoryGroupsApi } from '@/api/territoryGroups';

export const useDeleteTerritoryGroupMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => territoryGroupsApi.deleteTerritoryGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['territoryGroups'] });
    },
  });
};
