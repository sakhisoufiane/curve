import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../../api/users';
import { useAuthStore } from '../../stores/auth.store';

type Client = {
  name: string;
} & ({ clientId: string; payeeId?: string } | { clientId?: string; payeeId: string });

export const usePossibleClientsQuery = (searchTerm: string = '') => {
  const { sessionId } = useAuthStore();

  return useQuery<Client[]>({
    queryKey: ['possibleClients', sessionId, searchTerm],
    queryFn: () => usersApi.getPossibleClients(sessionId ?? '', { searchTerm }),
  });
};
