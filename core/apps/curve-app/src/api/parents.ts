import { curveApi } from './http';

export interface ParentQueryParams {
  text?: string;
  limit?: number;
  page?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

export interface ParentItem {
  _id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ParentsMeta {
  total: number;
  totalPages: number;
  currentPage: number;
}

export interface ParentsResponse {
  parents: ParentItem[];
  meta: ParentsMeta;
}

const getParents = async (params: ParentQueryParams = {}): Promise<ParentsResponse> => {
  const response = await curveApi.get('/parents', { params });
  return response.data;
};

export const parentsApi = {
  getParents,
};
