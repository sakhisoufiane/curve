import { useTranslation } from '@curveroyaltysystems/i18n';
import { EditPageTab } from '@/components/EditPageLayout';

export function IpChainTab() {
  const { t } = useTranslation('works');
  return <EditPageTab>{t('edit.tabs.ipChain')}</EditPageTab>;
}
