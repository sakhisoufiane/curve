import { curveApi } from './http';

const getNotificationById = async (id: string) => {
  const response = await curveApi.get(`/notifications/${id}`);
  return response.data;
};

const getAllNotifications = async (page: number) => {
  const params = { limit: 5 * (page || 1), orderBy: 'createdAt', orderDir: 'desc', page: 1 };
  const queryString = new URLSearchParams(params as unknown as Record<string, string>).toString();
  const response = await curveApi.get(`/notifications?${queryString}`);
  return response.data;
};

const getNotificationCount = async (read: boolean) => {
  const response = await curveApi.get(`/notifications/count?read=${read}`);
  return response.data;
};

const markNotificationRead = async (ids: string[]) => {
  const params = ids.map((id) => `ids[]=${id}`).join('&');
  const response = await curveApi.get(`/notifications/mark_read?${params}`);
  return response.data;
};

export const notificationsApi = {
  getNotificationById,
  getAllNotifications,
  getNotificationCount,
  markNotificationRead,
};
