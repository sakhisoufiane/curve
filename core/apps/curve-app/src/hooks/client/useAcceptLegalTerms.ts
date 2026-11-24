import { useMutation } from '@tanstack/react-query';
import { clientApi } from '../../api/client';

export const useAcceptLegalTerms = ({ onSuccess, onError }: { onSuccess: () => void; onError?: () => void }) => {
  const { mutate, isPending } = useMutation({
    mutationFn: () => clientApi.acceptLegalTerms(),
    onSuccess,
    onError: onError ?? (() => {}),
  });

  return { mutate, isPending };
};
