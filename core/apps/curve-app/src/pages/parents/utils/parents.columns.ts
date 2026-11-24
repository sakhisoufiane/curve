import { type DataTableColumn } from '@curveroyaltysystems/react-ui-library';
import { type ParentItem } from '@/api/parents';

export const getParentsColumns = (t: (key: string) => string): DataTableColumn<ParentItem>[] => [
  {
    id: 'name',
    type: 'link',
    header: t('columns.name'),
    value: (row) => row.name,
    href: (row) => `/parents/${row._id}/edit`,
    sortable: true,
  },
];
