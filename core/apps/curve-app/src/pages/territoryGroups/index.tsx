import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CreateButton,
  DataTable,
  DeleteDialog,
  DropdownMenuItem,
  DropdownMenuSeparator,
  EmptyState,
  Icon,
  NoResultsState,
} from '@curveroyaltysystems/react-ui-library';
import {
  IndexPageLayout,
  IndexPageSearchInput,
  IndexPageToolbar,
  IndexPageToolbarActions,
} from '@/components/IndexPageLayout';
import { getTerritoryGroupsColumns } from './utils/territoryGroups.columns';
import { useTerritoryGroupsIndex } from './hooks/useTerritoryGroupsIndex';

export const TerritoryGroupsIndex: React.FC = () => {
  const navigate = useNavigate();
  const idx = useTerritoryGroupsIndex();
  const { t } = idx;
  const columns = useMemo(() => getTerritoryGroupsColumns(t), [t]);
  const entityName = useMemo(() => idx.selectedIds.length > 1 ? 'entityNamePlural' : 'entityName', [idx.selectedIds.length]) 

  return (
    <IndexPageLayout
      title={t('title')}
      description={t('description')}
      helpLink="https://help.curveroyaltysystems.com/article/126-grouping-your-territories"
      toolbar={
        !idx.hasNoneAtAll ? (
          <IndexPageToolbar>
            <IndexPageSearchInput value={idx.search} onChange={idx.setSearch} placeholder={t('searchPlaceholder')} />
            <IndexPageToolbarActions
              disabled={idx.selectedIds.length === 0}
              selectedCount={idx.selectedIds.length}
              entityName={t(entityName)}
              dropdownItems={
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => idx.setDeleteId(idx.selectedIds[0] ?? null)}>
                    <Icon.Trash2 />
                    {t('deleteSelected')}
                  </DropdownMenuItem>
                </>
              }
            >
              <CreateButton entityName={t('entityName')} onClick={() => navigate('/territoryGroups/new')} />
            </IndexPageToolbarActions>
          </IndexPageToolbar>
        ) : undefined
      }
    >
      {idx.hasNoneAtAll ? (
        <EmptyState
          icon={Icon.Globe}
          title={t('emptyState.title')}
          description={t('emptyState.description')}
          helpLink="https://help.curveroyaltysystems.com/article/126-grouping-your-territories"
        >
          <CreateButton entityName={t('entityName')} onClick={() => navigate('/territoryGroups/new')} />
        </EmptyState>
      ) : (
        <DataTable
          columns={columns}
          data={idx.territoryGroups}
          isLoading={idx.isLoading || idx.isFetching}
          getRowId={(row) => row._id}
          onSelectionChange={idx.setSelectedIds}
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
            <NoResultsState message={t('noResults')} onClearSearch={idx.search ? () => idx.setSearch('') : undefined} />
          }
        />
      )}

      <DeleteDialog
        variant="standard"
        open={!!idx.deleteId}
        onClose={() => idx.setDeleteId(null)}
        entityName={t(entityName)}
        description={t('deleteDialog.description', { name: idx.deleteTarget?.name })}
        onConfirm={idx.confirmDelete}
      />
    </IndexPageLayout>
  );
};

export default TerritoryGroupsIndex;
