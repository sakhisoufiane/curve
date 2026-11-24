import { curveApi } from './http';

export interface ComposerParams {
  text?: string;
  limit?: number;
}

export interface ComposerItem {
  _id: string;
  name: string;
}

export interface ComposersResponse {
  composers: ComposerItem[];
}

const getComposers = async (params: ComposerParams = {}): Promise<ComposersResponse> => {
  const response = await curveApi.get('/composers', { params });
  return response.data;
};

export const composersApi = {
  getComposers,
};
