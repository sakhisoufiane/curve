import { type DataTableColumn, PercentPill } from '@curveroyaltysystems/react-ui-library';
import { type Work } from '@/api/works';
import { type TranslateFn } from './works.constants';
import { getWorkStatus } from './works.mapper';

export function getWorksColumns(t: TranslateFn): DataTableColumn<Work>[] {
  return [
    {
      id: 'title',
      type: 'link',
      header: t('columns.title'),
      value: (row) => row.title,
      href: (row) => `/works/${row._id}/edit`,
      sortable: true,
    },
    {
      id: 'composer',
      type: 'text',
      header: t('columns.composer'),
      value: (row) => row.composer,
      sortable: true,
    },
    {
      id: 'identifier',
      type: 'text',
      header: t('columns.identifier'),
      value: (row) => row.identifier,
      sortable: true,
    },
    {
      id: 'createdAt',
      type: 'date',
      header: t('columns.createdAt'),
      value: (row) => row.createdAt,
      sortable: true,
    },
    {
      id: 'totalOwnedMechanical',
      type: 'custom',
      header: t('columns.ownership'),
      render: (row) =>
        row.totalCollection?.totalOwnedMechanical != null ? (
          <PercentPill value={row.totalCollection.totalOwnedMechanical} indicator="arc" />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'totalParticipation',
      type: 'custom',
      header: t('columns.participation'),
      render: (row) =>
        row.totalParticipation != null ? (
          <PercentPill value={row.totalParticipation} indicator="arc" />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'approvalStatus',
      type: 'status',
      header: t('columns.status'),
      value: (row) => getWorkStatus(row),
      sortable: true,
    },
  ];
}
