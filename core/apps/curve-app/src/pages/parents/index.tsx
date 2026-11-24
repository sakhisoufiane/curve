import React, { useMemo } from 'react';
import {
  CreateButton,
  DataTable,
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
} from '@/components/IndexPageLayout';
import { useTranslation } from '@curveroyaltysystems/i18n';
import { getParentsColumns } from './utils/parents.columns';
import { useParentsIndex } from '@/hooks/parents/useParentsIndex';

export const ParentsIndex: React.FC = () => {
  const { state: sidebarState } = useSidebar();
  const navigate = useNavigate();
  const { t } = useTranslation('parents');
  const idx = useParentsIndex();
  const parentsColumns = useMemo(() => getParentsColumns(t), [t]);

  return (
    <IndexPageLayout
      title={t('title')}
      toolbar={
        !idx.hasNoParentsAtAll ? (
          <IndexPageToolbar>
            <IndexPageSearchInput
              value={idx.search}
              onChange={idx.setSearch}
              placeholder={t('searchPlaceholder')}
            />
            <div className="ml-auto">
              <CreateButton entityName={t('entityName')} onClick={() => navigate('/parents/new')} />
            </div>
          </IndexPageToolbar>
        ) : undefined
      }
    >
      {idx.hasNoParentsAtAll ? (
        <EmptyState
          icon={Icon.Users}
          title={t('emptyState.title')}
          description={t('emptyState.description')}
        >
          <CreateButton entityName={t('entityName')} onClick={() => navigate('/parents/new')} />
        </EmptyState>
      ) : (
        <DataTable
          columns={parentsColumns}
          data={idx.parents}
          isLoading={idx.isLoading || idx.isFetching}
          getRowId={(row) => row._id}
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

export default ParentsIndex;
