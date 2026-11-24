import React, { useMemo } from 'react';
import {
  Checkbox,
  ColumnVisibilityButton,
  ConfirmDialog,
  CreateButton,
  DataTable,
  DeleteDialog,
  DropdownMenuItem,
  DropdownMenuSeparator,
  EmptyState,
  FilterBar,
  FilterPills,
  HelpTooltip,
  Icon,
  ImportButton,
  ImportDialog,
  Label,
  NoResultsState,
  useSidebar,
} from '@curveroyaltysystems/react-ui-library';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '@curveroyaltysystems/i18n';
import {
  IndexPageLayout,
  IndexPageSearchInput,
  IndexPageToolbar,
  IndexPageToolbarActions,
} from '@/components/IndexPageLayout';
import { getWorksColumns } from './utils/works.columns';
import { useWorksIndex } from '@/hooks/works/useWorksIndex';

export const WorksIndex: React.FC = () => {
  const navigate = useNavigate();
  const { state: sidebarState } = useSidebar();
  const { t } = useTranslation('works');
  const idx = useWorksIndex();
  const columns = useMemo(() => getWorksColumns(t), [t]);
  const entityName = useMemo(() => idx.selectionCount > 1 ? 'entityNamePlural' : 'entityName', [idx.selectionCount]) 

  return (
    <IndexPageLayout
      title={t('title')}
      description={t('description')}
      helpLink="https://help.curveroyaltysystems.com/article/116-how-to-add-works-composers-publishers"
      toolbar={
        !idx.hasNoWorksAtAll ? (
          <IndexPageToolbar
            pills={
              idx.hasActiveFilters ? (
                <FilterPills
                  fields={idx.filterFields}
                  activeFilters={idx.activeFilters}
                  onChange={idx.handleFiltersChange}
                />
              ) : undefined
            }
          >
            <IndexPageSearchInput
              value={idx.search}
              onChange={idx.setSearch}
              placeholder={t('searchPlaceholder')}
            />
            <FilterBar
              fields={idx.filterFields}
              activeFilters={idx.activeFilters}
              onChange={idx.handleFiltersChange}
              showPills={false}
            />
            <ColumnVisibilityButton
              columns={columns}
              columnVisibility={idx.columnVisibility}
              onColumnVisibilityChange={idx.setColumnVisibility}
            />
            <IndexPageToolbarActions
              disabled={idx.hasNoWorksAtAll || idx.nothingSelected}
              selectedCount={idx.selectionCount}
              entityName={t(entityName)}
              dropdownItems={
                <>
                  <DropdownMenuItem onClick={() => idx.setFlushOpen(true)}>
                    <Icon.RefreshCw />
                    {t('actions.flushContracts')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Icon.CheckCircle />
                    {t('actions.approve')}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Icon.PauseCircle />
                    {t('actions.hold')}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Icon.PlayCircle />
                    {t('actions.resume')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Icon.Upload />
                    {t('actions.deliver')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Icon.Upload />
                    {t('actions.exportSelected')}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Icon.Upload />
                    {t('actions.exportValidationErrors')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => idx.setDeleteOpen(true)}>
                    <Icon.Trash2 />
                    {t('actions.deleteSelected')}
                  </DropdownMenuItem>
                </>
              }
            >
              <ImportButton variant="icon" onClick={() => idx.setImportOpen(true)} />
              <CreateButton entityName={t('entityName')} onClick={() => navigate('/works/new')} />
            </IndexPageToolbarActions>
          </IndexPageToolbar>
        ) : undefined
      }
    >
      {idx.hasNoWorksAtAll ? (
        <EmptyState
          icon={Icon.Music}
          title={t('emptyState.title')}
          description={t('emptyState.description')}
          helpLink="https://help.curveroyaltysystems.com/article/116-how-to-add-works-composers-publishers"
          helpLinkText={t('emptyState.helpLinkText')}
        >
          <ImportButton onClick={() => idx.setImportOpen(true)} />
          <CreateButton entityName={t('entityName')} onClick={() => navigate('/works/new')} />
        </EmptyState>
      ) : (
        <DataTable
          columns={columns}
          data={idx.works}
          isLoading={idx.isLoading || idx.isFetching}
          getRowId={(row) => row._id}
          onSelectionChange={idx.handleSelectionChange}
          onSelectAllChange={idx.setSelectAll}
          sidebarCollapsed={sidebarState === 'collapsed'}
          columnVisibility={idx.columnVisibility}
          onColumnVisibilityChange={idx.setColumnVisibility}
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
              onClearFilters={idx.hasActiveFilters ? () => idx.handleFiltersChange([]) : undefined}
            />
          }
        />
      )}
      <ImportDialog
        open={idx.importOpen}
        onClose={() => idx.setImportOpen(false)}
        entityName={t('importDialog.entityName')}
        accept=".xlsx"
        description={t('importDialog.description')}
        onSuccess={idx.onImportSuccess}
        onImport={idx.importWorks}
        templateName={t('importDialog.templateName')}
        onDownloadTemplate={idx.downloadTemplate}
      >
        <div className="flex items-center gap-2">
          <Checkbox
            id="overwrite-blank-values"
            checked={idx.overwriteBlankValues}
            onCheckedChange={(checked) => idx.setOverwriteBlankValues(checked === true)}
          />
          <Label htmlFor="overwrite-blank-values">{t('importDialog.overwriteBlankValues')}</Label>
          <HelpTooltip text={t('importDialog.overwriteBlankValuesTooltip')} />
        </div>
      </ImportDialog>
      <DeleteDialog
        variant="count"
        count={idx.selectionCount}
        open={idx.deleteOpen}
        onClose={() => idx.setDeleteOpen(false)}
        entityName={t(entityName)}
        description={t('deleteDialog.description')}
        onConfirm={idx.deleteWorks}
      />
      <ConfirmDialog
        variant="confirmation"
        confirmationText={t('flushDialog.confirmationText')}
        open={idx.flushOpen}
        onClose={() => idx.setFlushOpen(false)}
        title={t('flushDialog.title')}
        description={t('flushDialog.description')}
        confirmLabel={t('flushDialog.confirmLabel')}
        onConfirm={idx.flushWorks}
      />
    </IndexPageLayout>
  );
};

export default WorksIndex;
