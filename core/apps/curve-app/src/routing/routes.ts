import { lazy, type ComponentType } from 'react';
import { matchPath } from 'react-router-dom';

export interface RouteConfig {
  path: string;
  title?: string;
  component?: ComponentType;
}

// All route path strings. Use these constants for navigate() calls and <Link> destinations
// to keep paths in one place.
export const AppRoutes = {
  // Unauthenticated
  Login: '/login',
  ResetPassword: '/reset',
  SignUp: '/signup',
  SignUpConfirm: '/signup/confirm',
  ExpiredPassword: '/expired',

  // App pages — add a path constant here when creating a new page
  Dashboard: '/',
  Billing: '/billing',
  Statements: '/statements',
  Monitoring: '/monitoring',
  MonitoringTools: '/monitoring/tools',
  MonitoringAnalytics: '/monitoring/analytics',
  Parents: '/parents',
  Clients: '/clients',
  Companies: '/companies',
  Payees: '/payees',
  Contracts: '/contracts',
  Releases: '/releases',
  Tracks: '/tracks',
  Works: '/works',
  Composers: '/composers',
  Publishers: '/publishers',
  Deliveries: '/deliveries',
  CwrAcknowledgements: '/cwrAcknowledgements',
  DeliverySettings: '/deliverySettings',
  IswcDeliveries: '/iswcDeliveries',
  Sales: '/sales',
  SalesUnmapped: '/sales/unmapped',
  SalesUnmappedWorks: '/sales/unmapped_works',
  SalesDb: '/sales/salesdb',
  SalesGroups: '/sales/groups',
  Templates: '/templates',
  Costs: '/costs',
  Periods: '/periods',
  AccountingPeriods: '/accountingPeriods',
  Transactions: '/transactions',
  PaymentGroups: '/paymentGroups',
  CurvePaySetup: '/curvePay/setup',
  CurvePayBalances: '/curvePay/balances',
  CurvePayConversions: '/curvePay/conversions',
  PaymentDetails: '/paymentDetails',
  Analytics: '/analytics',
  Reports: '/reports',
  Imports: '/imports',
  Settings: '/settings',
  FtpIntegration: '/ftpIntegration',
  TerritoryGroups: '/territoryGroups',
  ContractTermGroups: '/contractTermGroups',
  Mcps: '/mcps',
  LibraryTemplates: '/libraryTemplates',
  FixedReports: '/fixedReports',
  Users: '/users',
  ApiDocs: '/api-docs',
} as const;

export type AppRoute = (typeof AppRoutes)[keyof typeof AppRoutes];

// Lazy-loaded components for authenticated pages rendered inside AppLayout.
// To add a page: lazy-import it below, then register it in ROUTES.
// Pages must use a default export (export default MyPage).
const Dashboard = lazy(() => import('@/pages/dashboards/Dashboard'));
const CompaniesIndex = lazy(() => import('@/pages/companies/index'));
const CompanyEdit = lazy(() => import('@/pages/companies/edit'));
const WorksIndex = lazy(() => import('@/pages/works/index'));
const WorkEdit = lazy(() => import('@/pages/works/edit'));
const TerritoryGroupEdit = lazy(() => import('@/pages/territoryGroups/edit'));
const TerritoryGroupsIndex = lazy(() => import('@/pages/territoryGroups/index'));
const ClientsIndex = lazy(() => import('@/pages/clients/index'));
const ParentsIndex = lazy(() => import('@/pages/parents/index').then((m) => ({ default: m.ParentsIndex })));

export const ROUTES: Record<string, RouteConfig> = {
  dashboard: {
    path: AppRoutes.Dashboard,
    title: 'Dashboard',
    component: Dashboard,
  },
  companies: {
    path: AppRoutes.Companies,
    title: 'Companies',
    component: CompaniesIndex,
  },
  companiesNew: {
    path: '/companies/new',
    component: CompanyEdit,
  },
  companiesEdit: {
    path: '/companies/:id/edit',
    title: 'Companies',
    component: CompanyEdit,
  },
  works: {
    path: AppRoutes.Works,
    title: 'Works',
    component: WorksIndex,
  },
  worksNew: {
    path: '/works/new',
    component: WorkEdit,
  },
  worksEdit: {
    path: '/works/:id/edit',
    title: 'Works',
    component: WorkEdit,
  },
  territoryGroups: {
    path: AppRoutes.TerritoryGroups,
    title: 'Territory Groups',
    component: TerritoryGroupsIndex,
  },
  territoryGroupsNew: {
    path: '/territoryGroups/new',
    component: TerritoryGroupEdit,
  },
  territoryGroupsEdit: {
    path: '/territoryGroups/:id/edit',
    title: 'Territory Groups',
    component: TerritoryGroupEdit,
  },
  clients: {
    path: AppRoutes.Clients,
    title: 'Clients',
    component: ClientsIndex,
  },
  parents: {
    path: AppRoutes.Parents,
    title: 'Parents',
    component: ParentsIndex,
  },
  // Page routes are added progressively as each page PR lands.
  // See new-design-pr-plan.md for the full sequence.
};

/** Returns the title for the route matching the given pathname, if defined. */
export const getRouteTitle = (pathname: string): string | undefined => {
  const match = Object.values(ROUTES).find((r) => matchPath(r.path, pathname));
  return match?.title;
};

