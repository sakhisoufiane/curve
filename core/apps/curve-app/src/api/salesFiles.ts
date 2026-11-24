import { curveApi } from './http';

const getSalesFiles = async (limit: number = 10, orderBy: string = 'createdAt', orderDir: string = 'desc') => {
  const response = await curveApi.get('/salesFiles', {
    params: {
      limit,
      orderBy,
      orderDir,
      archived: false,
    },
  });
  return response.data;
};

export const salesFilesApi = {
  getSalesFiles,
};
