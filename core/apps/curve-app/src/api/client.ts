import { curveApi } from './http';

export interface ClientSettings {
  catalogueGroups: string[];
}

export interface ClientsQueryParams {
  name?: string;
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

export interface Client {
  _id: string;
  name: string;
  createdAt: string;
}

export interface ClientsListResponse {
  clients: Client[];
  meta: {
    currentPage: number;
    totalPages: number;
    total: number;
  };
}

const getClient = async (clientId: string): Promise<ClientSettings> => {
  const response = await curveApi.get(`/clients/${clientId}`);
  return response.data;
};

const acceptLegalTerms = async () => {
  const response = await curveApi.post('/clients/accept_legal_terms');
  return response.data;
};

const getClientSummary = async (clientId: string) => {
  const response = await curveApi.get(`/clients/${clientId}/summary`);
  return response.data;
};

const getClientPeriodData = async (clientId: string) => {
  const response = await curveApi.get(`/clients/${clientId}/periods`);
  return response.data;
};

const getClients = async (params: ClientsQueryParams): Promise<ClientsListResponse> => {
  const response = await curveApi.get('/clients', { params });
  return response.data;
};

export interface ExportClientsParams {
  ids: string[];
  filter?: {
    name?: string;
    orderBy?: string;
    orderDir?: string;
    limit?: number;
    page?: number;
  };
}

const exportClients = async (params: ExportClientsParams): Promise<void> => {
  await curveApi.post('/clients/export', params);
};

export const clientApi = {
  getClient,
  acceptLegalTerms,
  getClientSummary,
  getClientPeriodData,
  getClients,
  exportClients,
};
