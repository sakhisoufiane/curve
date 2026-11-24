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
import { EditPageLayout } from '@/components/EditPageLayout';
import { useTerritoryGroupEdit } from '@/hooks/territoryGroups/useTerritoryGroupEdit';
import { OverviewTab } from './tabs/overview';

export const TerritoryGroupEdit = () => {
  const { t } = useTranslation('territoryGroups');
  const edit = useTerritoryGroupEdit();

  return (
    <>
      <EditPageLayout
        form={edit.form}
        title={edit.isNew ? t('edit.newGroup') : (edit.group?.name ?? '…')}
        isLoading={!edit.isNew && edit.isLoading}
        disabled={edit.isSaving}
        secondaryAction={
          !edit.isNew ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Icon.MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem variant="destructive" onClick={() => edit.setDeleteOpen(true)}>
                  <Icon.Trash2 />
                  {t('edit.menu.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : undefined
        }
        primaryAction={<SaveButton isPending={edit.isSaving} onClick={edit.submit} />}
      >
        <OverviewTab isLoading={!edit.isNew && edit.isLoading} />
      </EditPageLayout>

      <DeleteDialog
        variant="standard"
        open={edit.deleteOpen}
        onClose={() => edit.setDeleteOpen(false)}
        entityName={t('entityNameLower')}
        description={t('deleteDialog.description', { name: edit.group?.name })}
        onConfirm={edit.handleDelete}
      />
    </>
  );
};

export default TerritoryGroupEdit;
