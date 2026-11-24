import { useMutation, useQueryClient } from '@tanstack/react-query';
import { territoryGroupsApi, type TerritoryGroupFormData } from '@/api/territoryGroups';

export const useCreateTerritoryGroupMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TerritoryGroupFormData) => territoryGroupsApi.createTerritoryGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['territoryGroups'] });
    },
  });
};
