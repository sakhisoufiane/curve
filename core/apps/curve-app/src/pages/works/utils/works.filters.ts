import { type FilterField, Icon } from '@curveroyaltysystems/react-ui-library';
import { type TranslateFn } from './works.constants';

type Named = { _id: string; name: string };

export interface WorksFilterFieldOptions {
  catalogueGroups: string[];
  contracts: Named[];
  contractsLoading: boolean;
  onContractSearchChange: (value: string) => void;
  composers: Named[];
  composersLoading: boolean;
  onComposerSearchChange: (value: string) => void;
  publishers: Named[];
  publishersLoading: boolean;
  onPublisherSearchChange: (value: string) => void;
}

const toOptions = (items: Named[]) => items.map((i) => ({ label: i.name, value: i._id }));

export function getWorksFilterFields(t: TranslateFn, opts: WorksFilterFieldOptions): FilterField[] {
  return [
    {
      id: 'catalogueGroups',
      label: t('filters.catalogueGroups'),
      type: 'multi-select',
      icon: Icon.Layers,
      options: opts.catalogueGroups.map((g) => ({ label: g, value: g })),
    },
    {
      id: 'contractIds',
      label: t('filters.contract'),
      type: 'multi-select',
      icon: Icon.FileText,
      options: toOptions(opts.contracts),
      isLoading: opts.contractsLoading,
      onSearchChange: opts.onContractSearchChange,
    },
    {
      id: 'composerIds',
      label: t('filters.composer'),
      type: 'multi-select',
      icon: Icon.Mic2,
      options: toOptions(opts.composers),
      isLoading: opts.composersLoading,
      onSearchChange: opts.onComposerSearchChange,
    },
    {
      id: 'publisherIds',
      label: t('filters.publisher'),
      type: 'multi-select',
      icon: Icon.Building2,
      options: toOptions(opts.publishers),
      isLoading: opts.publishersLoading,
      onSearchChange: opts.onPublisherSearchChange,
    },
    {
      id: 'approvalStatus',
      label: t('filters.status'),
      type: 'radio',
      icon: Icon.CheckCircle2,
      options: [
        { label: t('filters.statusOptions.invalid'), value: 'Invalid' },
        { label: t('filters.statusOptions.readyForApproval'), value: 'Ready for Approval' },
        { label: t('filters.statusOptions.approved'), value: 'Approved' },
      ],
    },
    {
      id: 'onHold',
      label: t('filters.onHold'),
      type: 'radio',
      icon: Icon.PauseCircle,
      options: [
        { label: t('filters.onHoldOptions.yes'), value: 'true' },
        { label: t('filters.onHoldOptions.no'), value: 'false' },
      ],
    },
    {
      id: 'participation',
      label: t('filters.participation'),
      type: 'number',
      icon: Icon.Percent,
    },
    {
      id: 'ownership',
      label: t('filters.ownership'),
      type: 'number',
      icon: Icon.Percent,
    },
    {
      id: 'mainIdentifier',
      label: t('filters.mainIdentifier'),
      type: 'multi-select',
      icon: Icon.Hash,
      disabled: true,
    },
    {
      id: 'createdAfter',
      label: t('filters.createdAfter'),
      type: 'date',
      icon: Icon.Calendar,
    },
    {
      id: 'createdBefore',
      label: t('filters.createdBefore'),
      type: 'date',
      icon: Icon.Calendar,
    },
  ];
}
