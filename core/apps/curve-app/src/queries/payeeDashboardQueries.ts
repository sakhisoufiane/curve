import { payeesApi } from '@/api/payees';
import { statementsApi } from '@/api/statements';
import { formatCurrency } from '@/utils/currencyFormatter';

const DEFAULT_STATEMENTS_LIMIT = 10;
const DEFAULT_ORDER_BY = 'createdAt';
const DEFAULT_ORDER_DIR = 'desc' as const;

export const payeeBalanceQuery = async (
  payeeId: string,
  currency: string | null,
  currencySymbol: string | null
): Promise<string> => {
  const data = await payeesApi.getPayeeBalance(payeeId);
  return formatCurrency(data.payeeBalance, currency, currencySymbol);
};

export const recentStatementsQuery = () =>
  statementsApi.getStatements({
    limit: DEFAULT_STATEMENTS_LIMIT,
    orderBy: DEFAULT_ORDER_BY,
    orderDir: DEFAULT_ORDER_DIR,
  });
