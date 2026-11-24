import { curveApi } from './http';

const getPayeeBalance = async (payeeId: string) => {
  const response = await curveApi.get(`/payees/${payeeId}/payee_balance`);
  return response.data;
};

const getPayeeSummary = async (payeeId: string) => {
  const response = await curveApi.get(`/payees/${payeeId}/summary`);
  return response.data;
};

export const payeesApi = {
  getPayeeBalance,
  getPayeeSummary,
};
