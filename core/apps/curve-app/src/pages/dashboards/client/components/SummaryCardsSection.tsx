import { Flex, SummaryCard } from '@curveroyaltysystems/react-ui-library';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { clientSummaryQuery } from '@/queries/clientDashboardQueries';

export const SummaryCardsSection = ({
  clientId,
  currency,
  currencySymbol,
}: {
  clientId: string;
  currency: string | null;
  currencySymbol: string | null;
}) => {
  const { t } = useTranslation('dashboards');

  const {
    data: clientSummary,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['clientSummary', clientId, currency, currencySymbol],
    queryFn: () => clientSummaryQuery(clientId, currency, currencySymbol),
    enabled: !!clientId,
  });

  return (
    <Flex responsive="mobile-stack" align="stretch" justify="center" gap="lg" className="w-full" wrap="wrap">
      <SummaryCard
        className="flex-1 min-w-[200px] max-w-full"
        color="info"
        title={t('totalRevenue')}
        value={clientSummary?.totalRevenue ?? ''}
        isLoading={isLoading}
        isError={isError}
      />
      <SummaryCard
        className="flex-1 min-w-[200px] max-w-full"
        color="complete"
        title={t('totalCosts')}
        value={clientSummary?.totalCosts ?? ''}
        isLoading={isLoading}
        isError={isError}
      />
      <SummaryCard
        className="flex-1 min-w-[200px] max-w-full"
        color="primary"
        title={t('incompleteLines')}
        value={clientSummary?.incompleteLines ?? ''}
        isLoading={isLoading}
        isError={isError}
      />
    </Flex>
  );
};
