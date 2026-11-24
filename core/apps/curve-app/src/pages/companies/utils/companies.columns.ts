import { type DataTableColumn } from '@curveroyaltysystems/react-ui-library';
import { type Company } from '@/api/companies';

export const getCompaniesColumns = (t: (key: string) => string): DataTableColumn<Company>[] => [
  {
    id: 'name',
    type: 'link',
    header: t('columns.name'),
    value: (row) => row.name,
    href: (row) => `/companies/${row._id}/edit`,
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
