import { type TabDefinition } from '@/components/EditPageLayout';
import { type Work } from '@/api/works';
import { type TabId, type TranslateFn } from './works.constants';
import { OverviewTab } from '../tabs/overview';
import { TerritoriesTab } from '../tabs/TerritoriesTab';
import { IpChainTab } from '../tabs/IpChainTab';
import { RightsTab } from '../tabs/RightsTab';
import { AliasesTab } from '../tabs/AliasesTab';
import { DeliveriesTab } from '../tabs/DeliveriesTab';
import { AnalyticsTab } from '../tabs/AnalyticsTab';

export interface WorkTabsOptions {
  work?: Work;
  isNew: boolean;
  isLoading: boolean;
}

/** Builds the work edit tab definitions. Render closures capture the loaded work and loading state. */
export function getWorkTabs(t: TranslateFn, { work, isNew, isLoading }: WorkTabsOptions): TabDefinition<TabId>[] {
  return [
    {
      id: 'overview',
      label: t('edit.tabs.overview'),
      render: () => <OverviewTab work={work} isLoading={!isNew && isLoading} />,
    },
    { id: 'territories', label: t('edit.tabs.territories'), render: () => <TerritoriesTab /> },
    { id: 'ipChain', label: t('edit.tabs.ipChain'), render: () => <IpChainTab /> },
    { id: 'rights', label: t('edit.tabs.rights'), render: () => <RightsTab /> },
    { id: 'aliases', label: t('edit.tabs.aliases'), render: () => <AliasesTab /> },
    {
      id: 'deliveries',
      label: t('edit.tabs.deliveries'),
      render: () => <DeliveriesTab />,
      visible: ({ isNew: n }) => !n,
    },
    {
      id: 'analytics',
      label: t('edit.tabs.analytics'),
      render: () => <AnalyticsTab />,
      visible: ({ isNew: n }) => !n,
    },
  ];
}
