import { type DataTableColumn } from '@curveroyaltysystems/react-ui-library';
import { type Client } from '@/api/client';

export const getClientsColumns = (t: (key: string) => string): DataTableColumn<Client>[] => [
  {
    id: 'name',
    type: 'link',
    header: t('columns.name'),
    value: (row) => row.name,
    href: (row) => `/clients/${row._id}/edit`,
    sortable: true,
  },
  {
    id: 'createdAt',
    type: 'date',
    header: t('columns.createdAt'),
    value: (row) => row.createdAt,
    sortable: true,
  },
];
