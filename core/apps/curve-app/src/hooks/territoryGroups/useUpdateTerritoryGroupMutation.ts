import { useMutation, useQueryClient } from '@tanstack/react-query';
import { territoryGroupsApi, type TerritoryGroupFormData } from '@/api/territoryGroups';

export const useUpdateTerritoryGroupMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TerritoryGroupFormData> }) =>
      territoryGroupsApi.updateTerritoryGroup(id, data),
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ['territoryGroups'] });
      queryClient.setQueryData(['territoryGroup', group._id], group);
    },
  });
};
