import React, { useMemo } from 'react';
import {
  CreateButton,
  DataTable,
  DropdownMenuItem,
  EmptyState,
  Icon,
  NoResultsState,
  useSidebar,
} from '@curveroyaltysystems/react-ui-library';
import { Link, useNavigate } from 'react-router-dom';
import {
  IndexPageLayout,
  IndexPageSearchInput,
  IndexPageToolbar,
  IndexPageToolbarActions,
} from '@/components/IndexPageLayout';
import { useTranslation } from '@curveroyaltysystems/i18n';
import { getClientsColumns } from './utils/clients.columns';
import { useClientsIndex } from '@/hooks/client/useClientsIndex';

export const ClientsIndex: React.FC = () => {
  const { state: sidebarState } = useSidebar();
  const navigate = useNavigate();
  const { t } = useTranslation('clients');
  const idx = useClientsIndex();
  const clientsColumns = useMemo(() => getClientsColumns(t), [t]);
  const entityName = useMemo(() => idx.selectionCount > 1 ? 'entityNamePlural' : 'entityName', [idx.selectionCount]) 

  return (
    <IndexPageLayout
      title={t('title')}
      toolbar={
        !idx.hasNoClientsAtAll ? (
          <IndexPageToolbar>
            <IndexPageSearchInput
              value={idx.search}
              onChange={idx.setSearch}
              placeholder={t('searchPlaceholder')}
            />
            <IndexPageToolbarActions
              disabled={idx.nothingSelected}
              selectedCount={idx.selectionCount}
              entityName={t(entityName)}
              dropdownItems={
                idx.isInternalUser && (
                  <DropdownMenuItem onClick={idx.onExport} disabled={idx.isExporting}>
                    <Icon.Upload />
                    {t('export')}
                  </DropdownMenuItem>
                )
              }
            >
              <CreateButton entityName={t('entityName')} onClick={() => navigate('/clients/new')} />
            </IndexPageToolbarActions>
          </IndexPageToolbar>
        ) : undefined
      }
    >
      {idx.hasNoClientsAtAll ? (
        <EmptyState
          icon={Icon.Users}
          title={t('emptyState.title')}
          description={t('emptyState.description')}
        >
          <CreateButton entityName={t('entityName')} onClick={() => navigate('/clients/new')} />
        </EmptyState>
      ) : (
        <DataTable
          columns={clientsColumns}
          data={idx.clients}
          isLoading={idx.isLoading || idx.isFetching}
          getRowId={(row) => row._id}
          onSelectionChange={idx.handleSelectionChange}
          onSelectAllChange={idx.setSelectAll}
          sidebarCollapsed={sidebarState === 'collapsed'}
          mode="server"
          totalRows={idx.total}
          totalPages={idx.data?.meta.totalPages}
          page={idx.page}
          onPageChange={idx.setPage}
          pageSize={idx.pageSize}
          onPageSizeChange={(size) => {
            idx.setPageSize(size);
            idx.setPage(1);
          }}
          sortColumn={idx.sortColumn}
          sortDir={idx.sortDir}
          onSortChange={(col, dir) => {
            idx.setSortColumn(col);
            idx.setSortDir(dir);
            idx.setPage(1);
          }}
          renderLink={({ href, children, className }) => (
            <Link to={href} className={className}>
              {children}
            </Link>
          )}
          emptyState={
            <NoResultsState
              message={t('noResults')}
              onClearSearch={idx.search ? () => idx.setSearch('') : undefined}
            />
          }
        />
      )}
    </IndexPageLayout>
  );
};

export default ClientsIndex;
