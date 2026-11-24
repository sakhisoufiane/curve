import { SummaryCardsSection, RecentActivitySection, ChartSection } from './components';
import { useChartData } from './hooks/useChartData';
import { Button, EmptyState, Icon } from '@curveroyaltysystems/react-ui-library';
import { useClientStore } from '../../../stores/client.store';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from '@curveroyaltysystems/i18n';
import { SidebarClientSelector } from '@/components/AppLayout/Sidebar/SidebarClientSelector';
import { useNavigate } from 'react-router-dom';

export const ClientDashboard = () => {
  const { t } = useTranslation('dashboards');
  const navigate = useNavigate();
  const { clientId, currency, currencySymbol } = useClientStore(
    useShallow((state) => ({
      clientId: state.clientId,
      currency: state.currency,
      currencySymbol: state.currencySymbol,
    }))
  );
  const chartData = useChartData();

  if (clientId) {
    return (
      <div className="w-full space-y-6 py-6 px-6 sm:px-8 max-w-6xl mx-auto">
        <SummaryCardsSection clientId={clientId} currency={currency} currencySymbol={currencySymbol} />
        <RecentActivitySection clientId={clientId} currency={currency} currencySymbol={currencySymbol} />
        <ChartSection data={chartData} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center pt-8 pb-32">
      <EmptyState
        icon={Icon.Building2}
        title={t('selectClientPrompt')}
        description="Select a client to view your dashboard, or create a new one to get started."
        helpLink="https://help.curveroyaltysystems.com/article/256-creating-new-curve-clients-as-a-parent-user"
        helpLinkText="How to create Clients"
      >
        <div className="flex items-center gap-2">
          <div className="-mx-2 -mb-2">
            <SidebarClientSelector />
          </div>
          <Button className="shrink-0" onClick={() => navigate('/clients/new')}>
            <Icon.Plus className="size-4" />
            Create client
          </Button>
        </div>
      </EmptyState>
    </div>
  );
};

export default ClientDashboard;
