import { useMutation } from '@tanstack/react-query';
import { usersApi } from '@/api/users';
import { useAuthStore } from '@/stores/auth.store';
import { useUserStore } from '@/stores/user.store';
import useLoaderStore from '@/stores/loader.store';
import { applySetClientResponse } from '@/utils/applySetClientResponse';

// TODO: Update once API types are exposed
type Client = unknown & { clientName: string };

export const useSetClient = ({ onSuccess }: { onSuccess?: (data: Client) => void }) => {
  const { mutate, isPending } = useMutation({
    onMutate: () => {
      useLoaderStore.getState().startLoading();
    },
    onSettled: () => {
      useLoaderStore.getState().stopLoading();
    },
    mutationFn: async ({ clientId, userType }: { clientId: string; userType: 'client' | 'payee' }) => {
      const sessionId = useAuthStore.getState().sessionId ?? '';
      const data = await usersApi.setClient(sessionId, clientId, userType);
      return { data, selectedClientId: clientId };
    },
    onSuccess: ({ data }) => {
      const demoMode = useUserStore.getState().demoMode;
      applySetClientResponse(data, demoMode);
      onSuccess?.(data);
    },
  });

  return { mutate, isPending };
};
