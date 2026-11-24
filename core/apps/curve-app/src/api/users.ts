import { curveApi } from './http';

const getPossibleClients = async (userId: string, params: { searchTerm?: string } = {}) => {
  const response = await curveApi.get(`/users/${userId}/get_possible_clients`, { params });
  return response.data;
};

const setClient = async (userId: string, roleId: string, role?: string) => {
  const response = await curveApi.put(`/users/${userId}/set_client`, {
    roleId: roleId,
    role: role,
  });

  if (response.data.success === false) {
    throw new Error('Failed to set client');
  }
  return response.data;
};

const removeClient = async (userId: string) => {
  const response = await curveApi.put(`/users/${userId}/remove_client`);
  return response.data;
};

const enableMFA = async ({ type, token }: { type: 'Email' | 'Authenticator'; token: string }) => {
  const response = await curveApi.post('/users/enable_mfa', { type }, { headers: { token } });
  return response.data;
};

export const usersApi = {
  getPossibleClients,
  setClient,
  removeClient,
  enableMFA,
};
