import { contractsApi, type ContractItem } from '@/api/contracts';
import { salesFilesApi } from '@/api/salesFiles';
import { clientApi } from '@/api/client';
import { formatCurrency } from '@/utils/currencyFormatter';

interface SalesFileApiItem {
  _id: string;
  name: string;
  homeCurrencyNetAmount: number | null;
}

interface ClientSummaryApiResponse {
  totalRevenue: number | undefined;
  totalCosts: number | undefined;
  incompleteLines: number | undefined;
}

export interface ContractListItem {
  label: string;
  badge: string;
  href: string;
}

export interface SalesListItem {
  label: string;
  value: string;
  href: string;
}

export interface ClientSummaryData {
  totalRevenue: string;
  totalCosts: string;
  incompleteLines: string;
}

export const recentContractsQuery = async (): Promise<ContractListItem[]> => {
  const data = await contractsApi.getContracts({ limit: 10, orderBy: 'createdAt', orderDir: 'desc' });
  return data.contracts.map((contract: ContractItem) => ({
    label: contract.name,
    badge: contract.type,
    href: `/contracts/${contract._id}/edit`,
  }));
};

export const recentSalesFilesQuery = async (
  currency: string | null,
  currencySymbol: string | null
): Promise<SalesListItem[]> => {
  const data = await salesFilesApi.getSalesFiles();
  return (data.salesFiles as SalesFileApiItem[]).map((salesFile) => ({
    label: salesFile.name,
    value: formatCurrency(salesFile.homeCurrencyNetAmount, currency, currencySymbol),
    href: `/sales/${salesFile._id}/edit`,
  }));
};

export const clientSummaryQuery = async (
  clientId: string,
  currency: string | null,
  currencySymbol: string | null
): Promise<ClientSummaryData> => {
  const data = (await clientApi.getClientSummary(clientId)) as ClientSummaryApiResponse;
  return {
    totalRevenue: formatCurrency(data.totalRevenue, currency, currencySymbol),
    totalCosts: formatCurrency(data.totalCosts, currency, currencySymbol),
    incompleteLines: data.incompleteLines !== undefined ? String(data.incompleteLines) : '',
  };
};
