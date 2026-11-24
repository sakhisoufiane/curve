import { useQuery } from '@tanstack/react-query';
import { authApi, type WhiteLabelApiResponse } from '../../api/authenticate';

export const useGetWhiteLabelData = () => {
  return useQuery<WhiteLabelApiResponse>({
    queryKey: ['whiteLabel'],
    queryFn: authApi.getWhiteLabelData,
    notifyOnChangeProps: ['data', 'error'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
