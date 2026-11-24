import { useMutation, useQueryClient } from '@tanstack/react-query';
import { worksApi, type WorkFormData } from '@/api/works';

export const useCreateWorkMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: WorkFormData) => worksApi.createWork(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['works'] });
    },
  });
};
