import { useMutation, useQueryClient } from '@tanstack/react-query';
import { worksApi } from '@/api/works';

export const useDeleteWorkMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => worksApi.deleteWork(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['works'] });
    },
  });
};
