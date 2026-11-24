import { useTranslation } from '@curveroyaltysystems/i18n';
import {
  Button,
  DeleteDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icon,
  SaveButton,
} from '@curveroyaltysystems/react-ui-library';
import { EditPageLayout, EditPageTab } from '@/components/EditPageLayout';
import { useCompanyEdit } from '@/hooks/companies/useCompanyEdit';
import { OverviewSection } from './sections/OverviewSection';
import { LogoSection } from './sections/LogoSection';
import { FeesInvoiceSection } from './sections/FeesInvoiceSection';
import { StatementDetailsSection } from './sections/StatementDetailsSection';

export const CompanyEdit = () => {
  const { t } = useTranslation('companies');
  const edit = useCompanyEdit();

  const sectionLoading = !edit.isNew && edit.isLoading;

  return (
    <>
      <EditPageLayout
        form={edit.form}
        title={edit.isNew ? t('edit.create') : (edit.company?.name ?? '…')}
        updatedAt={edit.company?.updatedAt}
        isLoading={sectionLoading}
        disabled={edit.isSaving}
        primaryAction={edit.canEdit ? <SaveButton onClick={edit.submit} isPending={edit.isSaving} /> : undefined}
        secondaryAction={
          edit.canEdit && !edit.isNew ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Icon.MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* TODO(angular-migration): wire up the "See Full History" model-history modal (GET /companies/:id/history) */}
                <DropdownMenuItem variant="destructive" onClick={() => edit.setDeleteOpen(true)}>
                  <Icon.Trash2 className="size-4" />
                  {t('edit.menu.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : undefined
        }
      >
        <EditPageTab>
          <OverviewSection disabled={!edit.canEdit} isLoading={sectionLoading} />
          <LogoSection
            publicLogo={edit.company?.publicLogo}
            logoFile={edit.logoFile}
            onLogoChange={edit.setLogoFile}
            disabled={!edit.canEdit}
            isLoading={sectionLoading}
          />
          <FeesInvoiceSection disabled={!edit.canEdit} isLoading={sectionLoading} />
          <StatementDetailsSection disabled={!edit.canEdit} isLoading={sectionLoading} />
        </EditPageTab>
      </EditPageLayout>

      <DeleteDialog
        open={edit.deleteOpen}
        onClose={() => edit.setDeleteOpen(false)}
        entityName={t('entityNameLower')}
        description={t('deleteDialog.description')}
        onConfirm={edit.handleDelete}
      />
    </>
  );
};

export default CompanyEdit;
