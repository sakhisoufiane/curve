import { curveApi } from './http';

export interface TerritoryGroupsParams {
  text?: string;
  limit?: number;
  page?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

export interface TerritoryGroup {
  _id: string;
  clientId?: string;
  name: string;
  territories: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TerritoryGroupsMeta {
  total: number;
  totalPages: number;
  currentPage: number;
}

export interface TerritoryGroupsResponse {
  territoryGroups: TerritoryGroup[];
  meta: TerritoryGroupsMeta;
}

export type TerritoryGroupFormData = {
  name: string;
  territories: string[];
};

const getTerritoryGroups = async (params: TerritoryGroupsParams = {}): Promise<TerritoryGroupsResponse> => {
  const response = await curveApi.get('/territoryGroups', { params });
  return response.data;
};

const getTerritoryGroup = async (id: string): Promise<TerritoryGroup> => {
  const response = await curveApi.get(`/territoryGroups/${id}`);
  return response.data;
};

const createTerritoryGroup = async (data: TerritoryGroupFormData): Promise<TerritoryGroup> => {
  const response = await curveApi.post('/territoryGroups', data);
  return response.data;
};

const updateTerritoryGroup = async (id: string, data: Partial<TerritoryGroupFormData>): Promise<TerritoryGroup> => {
  const response = await curveApi.put(`/territoryGroups/${id}`, data);
  return response.data;
};

const deleteTerritoryGroup = async (id: string): Promise<void> => {
  await curveApi.delete(`/territoryGroups/${id}`);
};

export const territoryGroupsApi = {
  getTerritoryGroups,
  getTerritoryGroup,
  createTerritoryGroup,
  updateTerritoryGroup,
  deleteTerritoryGroup,
};
