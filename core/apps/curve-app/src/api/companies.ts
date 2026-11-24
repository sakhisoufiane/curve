import { curveApi } from './http';

export interface CompaniesQueryParams {
  text?: string;
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

export interface Company {
  _id: string;
  name: string;
  foreignId?: string;
  publicLogo?: string;
  feesInvoiceCustomText?: string;
  companyName?: string;
  address?: string;
  email?: string;
  statementCustomText?: string;
  statementOfAccountCustomText?: string;
  selfBillingTaxText?: string;
  selfBillingTaxCustomText?: string;
  vatNo?: string;
  statementDesign?: string;
  statementHeaderType?: string;
  // Report template selects store the report's _id (internal users only).
  salesReportTemplate?: string;
  costsReportTemplate?: string;
  statementIncludeTotalsRow?: boolean;
  suppressZeroValueInExport?: boolean;
  suppressStatementOfAccount?: boolean;
  displaySeparatedDeductions?: boolean;
  customDeductionName?: string;
  createdAt: string;
  updatedAt?: string;
}

/** Editable fields for the company edit/new form. Excludes server-managed fields and the logo (uploaded separately). */
export interface CompanyFormData {
  name: string;
  foreignId: string;
  feesInvoiceCustomText: string;
  companyName: string;
  address: string;
  email: string;
  statementCustomText: string;
  statementOfAccountCustomText: string;
  selfBillingTaxText: string;
  selfBillingTaxCustomText: string;
  vatNo: string;
  statementDesign: string;
  statementHeaderType: string;
  salesReportTemplate: string;
  costsReportTemplate: string;
  statementIncludeTotalsRow: boolean;
  suppressZeroValueInExport: boolean;
  suppressStatementOfAccount: boolean;
  displaySeparatedDeductions: boolean;
  customDeductionName: string;
}

export interface CompaniesListResponse {
  companies: Company[];
  meta: {
    currentPage: number;
    totalPages: number;
    total: number;
  };
}

const getCompanies = async (params: CompaniesQueryParams): Promise<CompaniesListResponse> => {
  const response = await curveApi.get('/companies', { params });
  return response.data;
};

const getCompany = async (id: string): Promise<Company> => {
  const response = await curveApi.get(`/companies/${id}`);
  return response.data;
};

const createCompany = async (data: CompanyFormData): Promise<Company> => {
  const response = await curveApi.post('/companies', data);
  return response.data;
};

const updateCompany = async (id: string, data: Partial<CompanyFormData>): Promise<Company> => {
  const response = await curveApi.put(`/companies/${id}`, data);
  return response.data;
};

const uploadCompanyLogo = async (id: string, file: File): Promise<Company> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await curveApi.post(`/companies/${id}/upload`, formData);
  return response.data;
};

const deleteCompany = async (id: string): Promise<void> => {
  await curveApi.delete(`/companies/${id}`);
};

export const companiesApi = {
  getCompanies,
  getCompany,
  createCompany,
  updateCompany,
  uploadCompanyLogo,
  deleteCompany,
};
