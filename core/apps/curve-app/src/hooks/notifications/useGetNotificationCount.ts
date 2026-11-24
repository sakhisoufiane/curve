import { notificationsApi } from '../../api/notifications';
import { useQuery } from '@tanstack/react-query';

export const useGetNotificationCount = (read: boolean = false) => {
  const { data, refetch } = useQuery({
    queryKey: ['notificationCount'],
    queryFn: () => notificationsApi.getNotificationCount(read),
    refetchInterval: 10000, // Refetch every 10 seconds (was 100000ms = 100 seconds)
  });

  return { unreadNotificationCount: data?.count, refetchNotificationCount: refetch };
};
