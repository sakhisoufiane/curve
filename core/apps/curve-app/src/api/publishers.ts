import { curveApi } from './http';

export interface PublisherParams {
  text?: string;
  limit?: number;
}

export interface PublisherItem {
  _id: string;
  name: string;
}

export interface PublishersResponse {
  publishers: PublisherItem[];
}

const getPublishers = async (params: PublisherParams = {}): Promise<PublishersResponse> => {
  const response = await curveApi.get('/publishers', { params });
  return response.data;
};

export const publishersApi = {
  getPublishers,
};
