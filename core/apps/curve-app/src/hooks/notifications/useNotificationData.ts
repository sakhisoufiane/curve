import { useMutation, useQuery } from '@tanstack/react-query';
import { notificationsApi } from '../../api/notifications';
import { useClientStore } from '../../stores/client.store';
import type { Notification } from '../../components/AppLayout/Header/Notifications/types';

// because apparently we can't trust the API to return a consistent type
const normalizeError = (e: unknown): string | null => {
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object') {
    const obj = e as Record<string, unknown>;
    if (typeof obj.message === 'string') return obj.message;
    const json = JSON.stringify(e);
    return json !== '{}' ? json : null;
  }
  return null;
};

const normalizeNotification = (n: Notification): Notification => {
  const rawErrors = n.notificationErrors ?? [];
  const errors = rawErrors.map(normalizeError).filter(Boolean) as string[];
  // If the raw errors existed but lost their messages (e.g. serialized as [{}]),
  // fall back to description so the Eye icon still appears with something useful.
  const notificationErrors =
    errors.length === 0 && rawErrors.length > 0 && n.description ? [n.description] : errors;
  return { ...n, urls: n.urls ?? [], notificationErrors };
};

export const useNotificationData = ({ page }: { page: number }) => {
  const { clientId } = useClientStore();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['notificationData', page, clientId],
    queryFn: () => notificationsApi.getAllNotifications(page),
    refetchInterval: 10000, // Refetch every 10 seconds (was 100000ms = 100 seconds)
  });

  const { mutate: markNotificationRead } = useMutation({
    mutationFn: (ids: string[]) => notificationsApi.markNotificationRead(ids),
  });

  return {
    markNotificationRead,
    notificationData: (data?.notifications ?? []).map(normalizeNotification),
    isLoading,
    error,
    refetchNotificationData: refetch,
  };
};
