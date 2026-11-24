import { useTranslation } from '@curveroyaltysystems/i18n';
import { EditPageTab } from '@/components/EditPageLayout';

export function DeliveriesTab() {
  const { t } = useTranslation('works');
  return <EditPageTab>{t('edit.tabs.deliveries')}</EditPageTab>;
}
