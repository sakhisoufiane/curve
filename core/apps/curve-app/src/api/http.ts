import axios from 'axios';
import { API_URL, APPLICATION_TOKEN } from '../config';
import { useAppStore } from '../stores/app.store';
import { useAuthStore } from '../stores/auth.store';
import { useClientStore } from '../stores/client.store';
import { useUserStore } from '../stores/user.store';

const createApiInstance = (baseURL: string) => {
  const instance = axios.create({
    baseURL,
  });

  instance.interceptors.request.use((config) => {
    const { token } = useAuthStore.getState();
    const { demoMode } = useUserStore.getState();

    config.headers.set('applicationToken', APPLICATION_TOKEN);
    // Let axios set the multipart boundary for FormData bodies (e.g. file uploads).
    if (!(config.data instanceof FormData)) {
      config.headers.set('Content-Type', 'application/json');
    }
    if (token && !config.headers.get('token')) {
      config.headers.set('token', token);
    }

    // API expects a 'demo' header to be set for requests made in demo mode, in order to return demo data
    if (demoMode) config.headers.set('demo', true);

    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      const { maintenanceMode, setMaintenanceMode } = useAppStore.getState();
      if (maintenanceMode) {
        setMaintenanceMode(false);
      }
      return response;
    },
    (error) => {
      if (!error.response) {
        console.error('Network error:', error.message);
        return Promise.reject(new Error(error.message));
      }

      switch (error.response.status) {
        case 503:
          useAppStore.getState().setMaintenanceMode(true);
          break;
        case 402:
          console.error('Client billing issue');
          useClientStore.getState().setClientData({ lockedForNonPayment: true });
          break;
      }

      const errorMsg = error.response.data?.error || error.response.data?.message || 'An error occurred';
      return Promise.reject(new Error(errorMsg));
    }
  );

  return instance;
};

export const curveApi = createApiInstance(API_URL);
