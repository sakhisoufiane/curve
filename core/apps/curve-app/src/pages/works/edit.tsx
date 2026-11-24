import { useTranslation } from '@curveroyaltysystems/i18n';
import {
  Button,
  DeleteDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icon,
  SaveButton,
  StatusBadge,
} from '@curveroyaltysystems/react-ui-library';
import { EditPageLayout, EditPageAlert, EditPageTabs } from '@/components/EditPageLayout';
import { useWorkEdit } from '@/hooks/works/useWorkEdit';

export const WorkEdit = () => {
  const { t } = useTranslation('works');
  const edit = useWorkEdit();

  return (
    <>
      <EditPageLayout
        form={edit.form}
        title={edit.isNew ? t('edit.newWork') : (edit.work?.title ?? '…')}
        updatedAt={edit.work?.updatedAt}
        badge={edit.workStatus ? <StatusBadge status={edit.workStatus} /> : undefined}
        isLoading={!edit.isNew && edit.isLoading}
        disabled={edit.isSaving}
        alert={
          edit.work?.validationErrors?.length ? (
            <EditPageAlert
              variant="error"
              title={t('edit.validationErrorsTitle')}
              messages={edit.work.validationErrors}
            />
          ) : undefined
        }
        primaryAction={<SaveButton onClick={edit.submit} isPending={edit.isSaving} />}
        secondaryAction={
          !edit.isNew ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Icon.MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled={edit.workStatus !== 'readyForApproval'}>
                  <Icon.CheckCircle className="size-4" />
                  {t('edit.menu.approve')}
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!edit.workStatus}>
                  {edit.isOnHold ? <Icon.PlayCircle className="size-4" /> : <Icon.PauseCircle className="size-4" />}
                  {edit.isOnHold ? t('edit.menu.resume') : t('edit.menu.hold')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Icon.Copy className="size-4" />
                  {t('edit.menu.duplicate')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => edit.setDeleteOpen(true)}>
                  <Icon.Trash2 className="size-4" />
                  {t('edit.menu.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : undefined
        }
      >
        <EditPageTabs tabs={edit.visibleTabs} activeTab={edit.activeTab} />
      </EditPageLayout>

      <DeleteDialog
        open={edit.deleteOpen}
        onClose={() => edit.setDeleteOpen(false)}
        entityName={t('entityNameLower')}
        description={t('edit.deleteDescription')}
        onConfirm={edit.handleDelete}
      />
    </>
  );
};

export default WorkEdit;
