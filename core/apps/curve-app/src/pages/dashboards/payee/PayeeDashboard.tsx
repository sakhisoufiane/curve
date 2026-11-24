import { ClientSelector } from '../../../components/ClientSelector/ClientSelector';
import { Button, Flex, SummaryCard } from '@curveroyaltysystems/react-ui-library';
import { LatestStatementSection, RecentStatementsSection } from './components';
import { useQuery } from '@tanstack/react-query';
import { useClientStore } from '../../../stores/client.store';
import { useShallow } from 'zustand/react/shallow';
import { useUserStore } from '../../../stores/user.store';
import { useTranslation } from '@curveroyaltysystems/i18n';
import { payeeBalanceQuery, recentStatementsQuery } from '@/queries/payeeDashboardQueries';

export const PayeeDashboard = () => {
  const { t } = useTranslation('dashboards');
  const { payeeId, currency, currencySymbol, clientType } = useClientStore(
    useShallow((state) => ({
      payeeId: state.payeeId,
      currency: state.currency,
      currencySymbol: state.currencySymbol,
      clientType: state.clientType,
    }))
  );
  const { userType } = useUserStore(
    useShallow((state) => ({
      userType: state.userType,
    }))
  );

  const {
    data: payeeBalance,
    isLoading: isLoadingPayeeBalance,
    isError: isPayeeBalanceError,
  } = useQuery({
    queryKey: ['payeeBalance', payeeId, currency, currencySymbol],
    queryFn: () => payeeBalanceQuery(payeeId!, currency, currencySymbol),
    enabled: !!payeeId,
  });

  const {
    data: statementsData,
    isLoading: isLoadingStatements,
    isError: isStatementsError,
  } = useQuery({
    queryKey: ['statements', payeeId],
    queryFn: recentStatementsQuery,
    enabled: !!payeeId,
  });

  return (
    <Flex direction="col" align="center" justify="center" gap="md" className="w-full h-full">
      <div>{t('switchBetweenClients')}</div>
      <ClientSelector />
      <SummaryCard
        isLoading={isLoadingPayeeBalance}
        isError={isPayeeBalanceError}
        className="min-w-[220px]"
        title={t('balance')}
        value={payeeBalance ?? ''}
        align="center"
      />
      <Button>{t('exportPayeeSummary')}</Button>
      <StatementsSection
        isLoading={isLoadingStatements}
        isError={isStatementsError}
        statements={statementsData}
        currency={currency}
        currencySymbol={currencySymbol}
        userType={userType}
        clientType={clientType}
      />
    </Flex>
  );
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const StatementsSection = ({
  isLoading,
  isError,
  statements,
  currency,
  currencySymbol,
  userType,
  clientType,
}: {
  isLoading: boolean;
  isError: boolean;
  statements: any;
  currency: string | null;
  currencySymbol: string | null;
  userType: string | null;
  clientType: string | null;
}) => {
  return (
    <>
      <LatestStatementSection
        currency={currency}
        currencySymbol={currencySymbol}
        userType={userType}
        clientType={clientType}
        isLoading={isLoading}
        statement={statements?.statements?.[0]}
        statements={statements?.statements}
      />
      <RecentStatementsSection
        currency={currency}
        currencySymbol={currencySymbol}
        isLoading={isLoading}
        isError={isError}
        statements={statements?.statements ?? []}
      />
    </>
  );
};

export default PayeeDashboard;
