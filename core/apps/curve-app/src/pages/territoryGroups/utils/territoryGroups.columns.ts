import { type DataTableColumn } from '@curveroyaltysystems/react-ui-library';
import { type TerritoryGroup } from '@/api/territoryGroups';

export const getTerritoryGroupsColumns = (t: (key: string) => string): DataTableColumn<TerritoryGroup>[] => [
  {
    id: 'name',
    type: 'link',
    header: t('columns.name'),
    value: (row) => row.name,
    href: (row) => `/territoryGroups/${row._id}/edit`,
    sortable: true,
  },
  {
    id: 'territories',
    type: 'number',
    header: t('columns.territories'),
    value: (row) => row.territories.length,
  },
  {
    id: 'createdAt',
    type: 'date',
    header: t('columns.createdAt'),
    value: (row) => row.createdAt,
    sortable: true,
  },
];
