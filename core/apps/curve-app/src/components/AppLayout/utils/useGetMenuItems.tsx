import type { MenuItem } from './types';
import * as conditions from './conditions';
import { Icon } from '@curveroyaltysystems/react-ui-library';
import { useTranslation } from '@curveroyaltysystems/i18n';
import { useClientStore } from '../../../stores/client.store';
import { useUserStore } from '../../../stores/user.store';
import { AppRoutes } from '../../../routing/routes';

export const useGetMenuItems = (): MenuItem[] => {
  const { t } = useTranslation('navigation');
  const clientState = useClientStore();
  const userState = useUserStore();
  const { clientType } = clientState;
  const { userType } = userState;
  return [
    {
      key: 'dashboard',
      title: t('dashboard'),
      url: AppRoutes.Dashboard,
      icon: Icon.Home,
      condition: conditions.showDashboard,
      isActive: false,
    },
    {
      key: 'support',
      title: t('support'),
      icon: Icon.Headphones,
      condition: conditions.showSupport,
      isActive: false,
      items: [
        {
          key: 'monitoring',
          title: t('monitoring'),
          url: AppRoutes.Monitoring,
        },
        {
          key: 'tools',
          title: t('tools'),
          url: AppRoutes.MonitoringTools,
        },
        {
          key: 'supportAnalytics',
          title: t('supportAnalytics'),
          url: AppRoutes.MonitoringAnalytics,
        },
      ],
    },
    {
      key: 'parents',
      title: t('parents'),
      url: AppRoutes.Parents,
      icon: Icon.Users,
      condition: conditions.showParents,
      isActive: false,
    },
    {
      key: 'clients',
      title: t('clients'),
      url: AppRoutes.Clients,
      icon: Icon.UserRoundSearch,
      condition: conditions.showClients,
      isActive: false,
    },
    {
      key: 'companies',
      title: t('companies'),
      url: AppRoutes.Companies,
      icon: Icon.Building,
      condition: conditions.showCompanies,
      isActive: false,
    },
    {
      key: 'contracts',
      title: t('contracts'),
      icon: Icon.Edit,
      condition: conditions.showContracts,
      isActive: false,
      items: [
        {
          key: 'payees',
          title: t('payees'),
          url: AppRoutes.Payees,
        },
        {
          key: 'contracts',
          title: t('contracts'),
          url: `${AppRoutes.Contracts}?contractType=Artist`,
        },
        {
          key: 'mechanicals',
          title: t('mechanicals'),
          url: `${AppRoutes.Contracts}?contractType=Mechanical`,
          condition: conditions.showMechanicals,
        },
      ],
    },
    {
      key: 'catalogue',
      title: t('catalogue'),
      icon: Icon.Book,
      condition: conditions.showCatalogue,
      isActive: false,
      items: [
        {
          key: 'releases',
          title: t('releases'),
          url: AppRoutes.Releases,
        },
        {
          key: 'tracks',
          title: t('tracks'),
          url: AppRoutes.Tracks,
        },
        {
          key: 'works',
          title: t('works'),
          url: AppRoutes.Works,
          condition: conditions.showWorks,
        },
        {
          key: 'composers',
          title: t('composers'),
          url: AppRoutes.Composers,
          condition: conditions.showComposers,
        },
        {
          key: 'publishers',
          title: t('publishers'),
          url: AppRoutes.Publishers,
          condition: conditions.showPublishers,
        },
        {
          key: 'manage',
          title: t('Manage'),
          url: '/catalogue/manage',
          condition: conditions.showCatalogueManagement,
        },
      ],
    },
    {
      key: 'deliveries',
      title: t('deliveries'),
      icon: Icon.Navigation,
      condition: conditions.showDeliveries,
      isActive: false,
      items: [
        {
          key: 'deliveries',
          title: t('deliveries'),
          url: AppRoutes.Deliveries,
        },
        {
          key: 'acknowledgements',
          title: t('acknowledgements'),
          url: AppRoutes.CwrAcknowledgements,
        },
        {
          key: 'deliverySettings',
          title: t('deliverySettings'),
          url: AppRoutes.DeliverySettings,
        },
        {
          key: 'iswc',
          title: t('iswc'),
          url: AppRoutes.IswcDeliveries,
          condition: conditions.showIswcDeliveries,
        },
      ],
    },
    {
      key: 'sales',
      title: clientType === 'Publisher' ? t('income') : t('sales'),
      icon: Icon.DollarSign,
      condition: conditions.showSales,
      isActive: false,
      items: [
        {
          key: 'sales',
          title: clientType === 'Publisher' ? t('income') : t('sales'),
          url: AppRoutes.Sales,
        },
        {
          key: 'unmapped',
          title: t('unmapped'),
          url: AppRoutes.SalesUnmapped,
          condition: conditions.showUnmappedTracksReleases,
        },
        {
          key: 'templates',
          title: t('templates'),
          url: AppRoutes.Templates,
        },
        {
          key: 'unmappedWorks',
          title: t('unmapped'),
          url: AppRoutes.SalesUnmappedWorks,
          condition: conditions.showUnmappedWorks,
        },
        {
          key: 'salesDb',
          title: clientType === 'Publisher' ? t('incomeDb') : t('salesDb'),
          url: AppRoutes.SalesDb,
          condition: clientType === 'Publisher' ? conditions.showIncomeDb : conditions.showSalesDb,
        },
        {
          key: 'costs',
          title: t('costs'),
          url: AppRoutes.Costs,
          condition: conditions.showCosts,
        },
        {
          key: 'groups',
          title: t('groups'),
          url: AppRoutes.SalesGroups,
          condition: conditions.showGroups,
        },
      ],
    },
    {
      key: 'statements',
      title: t('statements'),
      icon: Icon.Paperclip,
      condition: () => userType !== 'payee' && conditions.showStatements(),
      isActive: false,
      items: [
        {
          key: 'periods',
          title: t('period'),
          url: AppRoutes.Periods,
        },
        {
          key: 'statements',
          title: t('statements'),
          url: AppRoutes.Statements,
        },
        {
          key: 'accountingPeriods',
          title: t('accounting'),
          url: AppRoutes.AccountingPeriods,
          condition: conditions.showAccountingPeriods,
        },
      ],
    },
    {
      key: 'artist-statements',
      title: t('statements'),
      url: AppRoutes.Statements,
      icon: Icon.Paperclip,
      condition: () => userType === 'payee' && conditions.showArtistStatements(),
      isActive: false,
    },
    {
      key: 'transactions',
      title: t('transactions'),
      url: AppRoutes.Transactions,
      icon: Icon.CreditCard,
      condition: conditions.showTransactions,
      isActive: false,
    },
    {
      key: 'payment-groups',
      title: t('payments'),
      url: AppRoutes.PaymentGroups,
      icon: Icon.CreditCard,
      condition: conditions.showPayments,
      isActive: false,
    },
    {
      key: 'curve-payments',
      title: t('payments'),
      icon: Icon.CreditCard,
      condition: conditions.showCurvePayments,
      isActive: false,
      items: [
        {
          key: 'setup',
          title: t('setup'),
          url: AppRoutes.CurvePaySetup,
        },
        {
          key: 'balances',
          title: t('balances'),
          url: AppRoutes.CurvePayBalances,
          condition: () => conditions.hasFeature('payments'),
        },
        {
          key: 'payments',
          title: t('payments'),
          url: AppRoutes.PaymentGroups,
          condition: () => conditions.hasFeature('payments'),
        },
        {
          key: 'conversions',
          title: t('conversions'),
          url: AppRoutes.CurvePayConversions,
          condition: () => conditions.hasFeature('payments'),
        },
      ],
    },
    {
      key: 'payment-details',
      title: t('payments'),
      url: AppRoutes.PaymentDetails,
      icon: Icon.DollarSign,
      condition: conditions.showArtistPayments,
      isActive: false,
    },
    {
      key: 'data',
      title: t('data'),
      icon: Icon.BarChart,
      condition: conditions.showData,
      isActive: false,
      items: [
        {
          key: 'analytics',
          title: t('analytics'),
          url: AppRoutes.Analytics,
        },
        {
          key: 'reports',
          title: t('reports'),
          url: AppRoutes.Reports,
        },
      ],
    },
    {
      key: 'imports',
      title: t('imports'),
      url: AppRoutes.Imports,
      icon: Icon.Download,
      condition: conditions.showImports,
      isActive: false,
    },
    {
      key: 'imports-publisher',
      title: t('imports'),
      icon: Icon.Upload,
      condition: conditions.showImportsPublisher,
      isActive: false,
      items: [
        {
          key: 'cwr',
          title: t('cwr'),
          url: `${AppRoutes.Imports}?transferringSystem=CWR`,
        },
        {
          key: 'catalogueShipment',
          title: t('catalogueShipment'),
          url: `${AppRoutes.Imports}?transferringSystem=Catalogue Shipment`,
        },
        {
          key: 'other',
          title: t('other'),
          url: AppRoutes.Imports,
        },
      ],
    },
    {
      key: 'settings',
      title: t('settings'),
      icon: Icon.Settings,
      condition: conditions.showSettings,
      isActive: false,
      items: [
        {
          key: 'general',
          title: t('general'),
          url: AppRoutes.Settings,
          condition: conditions.isNotLockedForNonPayment,
        },
        {
          key: 'billing',
          title: t('billing'),
          url: AppRoutes.Billing,
          condition: conditions.showBilling,
        },
        {
          key: 'integrationsAndFtp',
          title: t('integrationsAndFtp'),
          url: AppRoutes.FtpIntegration,
          condition: conditions.showFtpIntegration,
        },
        {
          key: 'territoryGroups',
          title: t('territoryGroups'),
          url: AppRoutes.TerritoryGroups,
          condition: conditions.showTerritoryGroups,
        },
        {
          key: 'contractTermGroups',
          title: t('contractTermGroups'),
          url: AppRoutes.ContractTermGroups,
          condition: conditions.showContractTermGroups,
        },
        {
          key: 'mcpsConfig',
          title: t('mcpsConfig'),
          url: AppRoutes.Mcps,
          condition: conditions.showMcps,
        },
        {
          key: 'libraryTemplates',
          title: t('libraryTemplates'),
          url: AppRoutes.LibraryTemplates,
          condition: conditions.showLibraryTemplates,
        },
        {
          key: 'fixedReports',
          title: t('fixedReports'),
          url: AppRoutes.FixedReports,
          condition: conditions.showFixedReports,
        },
      ],
    },
    {
      key: 'users',
      title: t('users'),
      url: AppRoutes.Users,
      icon: Icon.Users,
      condition: conditions.showUsers,
      isActive: false,
    },
    {
      key: 'api-docs',
      title: t('apiDocs'),
      url: AppRoutes.ApiDocs,
      icon: Icon.Code,
      condition: conditions.showApiDocs,
      isActive: false,
    },
  ];
};
