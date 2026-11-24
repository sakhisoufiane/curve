import { curveApi } from './http';

const getStatements = async ({ limit, orderBy, orderDir }: { limit: number; orderBy: string; orderDir: string }) => {
  const response = await curveApi.get('/statements', { params: { limit, orderBy, orderDir } });
  return response.data;
};

const getStatement = async (id: string) => {
  const response = await curveApi.get(`/statements/${id}`);
  return response.data;
};

export const statementsApi = {
  getStatements,
  getStatement,
};
