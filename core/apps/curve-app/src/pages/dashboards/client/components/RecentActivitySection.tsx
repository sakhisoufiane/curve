import { Flex, ListCard } from '@curveroyaltysystems/react-ui-library';
import { useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { recentContractsQuery, recentSalesFilesQuery } from '@/queries/clientDashboardQueries';

interface RecentActivitySectionProps {
  clientId: string;
  currency: string | null;
  currencySymbol: string | null;
}

export const RecentActivitySection = ({ clientId, currency, currencySymbol }: RecentActivitySectionProps) => {
  const { t } = useTranslation('dashboards');

  const [
    { data: recentContracts, isLoading: isContractsLoading, isError: isContractsError },
    { data: recentSales, isLoading: isSalesLoading, isError: isSalesError },
  ] = useQueries({
    queries: [
      { queryKey: ['contracts', clientId], queryFn: recentContractsQuery },
      { queryKey: ['salesFiles', clientId], queryFn: () => recentSalesFilesQuery(currency, currencySymbol) },
    ],
  });

  return (
    <Flex responsive="mobile-stack" align="stretch" justify="center" gap="lg" className="w-full" wrap="wrap">
      <ListCard
        isLoading={isContractsLoading}
        isError={isContractsError}
        className="flex-1 min-w-[300px] max-w-full"
        title={t('recentContracts')}
        items={recentContracts ?? []}
      />
      <ListCard
        isLoading={isSalesLoading}
        isError={isSalesError}
        className="flex-1 min-w-[300px] max-w-full"
        title={t('recentSales')}
        items={recentSales ?? []}
      />
    </Flex>
  );
};
