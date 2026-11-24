import { useMutation, useQueryClient } from '@tanstack/react-query';
import { worksApi, type WorkFormData } from '@/api/works';

export const useUpdateWorkMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WorkFormData> }) =>
      worksApi.updateWork(id, data),
    onSuccess: (work) => {
      queryClient.invalidateQueries({ queryKey: ['works'] });
      queryClient.setQueryData(['work', work._id], work);
    },
  });
};
