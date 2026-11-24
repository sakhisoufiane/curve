import { curveApi } from './http';

export interface ContractParams {
  text?: string;
  limit?: number;
  page?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  contractType?: string;
  companyIds?: string[];
  contractCategories?: string[];
  valid?: boolean;
  expiresAfter?: string;
  expiresBefore?: string;
}

export interface ContractItem {
  _id: string;
  name: string;
  type: string;
  contractType?: string;
  contractCategories?: string[];
  createdAt?: string;
  updatedAt?: string;
  valid?: boolean;
  active?: boolean;
}

export interface ContractsMeta {
  total: number;
  totalPages: number;
  currentPage: number;
}

export interface ContractsResponse {
  contracts: ContractItem[];
  meta: ContractsMeta;
}

const getContracts = async (params: ContractParams = {}): Promise<ContractsResponse> => {
  const response = await curveApi.get('/contracts', { params });
  return response.data;
};

const getContract = async (id: string): Promise<ContractItem> => {
  const response = await curveApi.get(`/contracts/${id}`);
  return response.data;
};

export const contractsApi = {
  getContracts,
  getContract,
};
