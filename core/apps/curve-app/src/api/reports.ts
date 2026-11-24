import { curveApi } from './http';

export interface ReportsQueryParams {
  limit?: number;
}

export interface Report {
  _id: string;
  name: string;
  /** e.g. 'Sales Output', 'Royalties', 'Costs Output' — used to group report templates. */
  table: string;
}

export interface ReportsResponse {
  reports: Report[];
}

const getReports = async (params: ReportsQueryParams = {}): Promise<ReportsResponse> => {
  const response = await curveApi.get('/reports', { params });
  return response.data;
};

export const reportsApi = {
  getReports,
};
