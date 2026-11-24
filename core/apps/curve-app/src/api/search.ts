import { curveApi } from './http';

const search = async (text: string) => {
  const response = await curveApi.get('/search', {
    params: { text },
  });
  return response.data;
};

export const searchApi = {
  search,
};
