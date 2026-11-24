import { useMutation } from '@tanstack/react-query';
import { usersApi } from '../../api/users';

export const useSetupMFA = () => {
  const { mutate: enableMFA } = useMutation({
    mutationFn: ({ type, token }: { type: 'Email' | 'Authenticator'; token: string }) =>
      usersApi.enableMFA({ type, token }),
  });

  return {
    enableMFA,
  };
};
