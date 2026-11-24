import React, { useMemo } from 'react';
import {
  CreateButton,
  DataTable,
  DeleteDialog,
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
import { getCompaniesColumns } from './utils/companies.columns';
import { useCompaniesIndex } from '@/hooks/companies/useCompaniesIndex';

export const CompaniesIndex: React.FC = () => {
  const { state: sidebarState } = useSidebar();
  const navigate = useNavigate();
  const { t } = useTranslation('companies');
  const idx = useCompaniesIndex();
  const companiesColumns = useMemo(() => getCompaniesColumns(t), [t]);
  const entityName = useMemo(() => idx.selectionCount > 1 ? 'entityNamePlural' : 'entityName', [idx.selectionCount]) 

  return (
    <IndexPageLayout
      title={t('title')}
      toolbar={
        !idx.hasNoCompaniesAtAll ? (
          <IndexPageToolbar>
            <IndexPageSearchInput value={idx.search} onChange={idx.setSearch} placeholder={t('searchPlaceholder')} />
            {idx.canEditContracts && (
              <IndexPageToolbarActions
                disabled={idx.nothingSelected}
                selectedCount={idx.selectionCount}
                entityName={t(entityName)}
                dropdownItems={
                  <DropdownMenuItem variant="destructive" onClick={() => idx.setDeleteOpen(true)}>
                    <Icon.Trash2 />
                    {t('deleteSelected')}
                  </DropdownMenuItem>
                }
              >
                <CreateButton entityName={t('entityName')} onClick={() => navigate('/companies/new')} />
              </IndexPageToolbarActions>
            )}
          </IndexPageToolbar>
        ) : undefined
      }
    >
      {idx.hasNoCompaniesAtAll ? (
        <EmptyState icon={Icon.Building2} title={t('emptyState.title')} description={t('emptyState.description')}>
          {idx.canEditContracts && (
            <CreateButton entityName={t('entityName')} onClick={() => navigate('/companies/new')} />
          )}
        </EmptyState>
      ) : (
        <DataTable
          columns={companiesColumns}
          data={idx.companies}
          isLoading={idx.isLoading || idx.isFetching}
          getRowId={(row) => row._id}
          key={idx.selectionKey}
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
            <NoResultsState message={t('noResults')} onClearSearch={idx.search ? () => idx.setSearch('') : undefined} />
          }
        />
      )}
      <DeleteDialog
        variant="count"
        count={idx.selectionCount}
        open={idx.deleteOpen}
        onClose={() => idx.setDeleteOpen(false)}
        entityName={t(entityName)}
        description={t('deleteDialog.description')}
        onConfirm={async () => idx.onDelete()}
      />
    </IndexPageLayout>
  );
};

export default CompaniesIndex;
