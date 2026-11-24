import { AppDialog } from '@curveroyaltysystems/react-ui-library';
import { useTranslation } from '@curveroyaltysystems/i18n';
import type { Notification } from './types';

interface NotificationErrorsDialogProps {
  open: boolean;
  onClose: () => void;
  notification: Notification;
}

export const NotificationErrorsDialog = ({ open, onClose, notification }: NotificationErrorsDialogProps) => {
  const { t } = useTranslation();

  return (
    <AppDialog open={open} onClose={onClose} title={notification.name}>
      <div className="flex flex-col gap-3">
        {notification.urls.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold mb-0">{t('links')}</p>
            <ul className="list-none p-0 m-0">
              {notification.urls.map((url) => (
                <li key={url.url}>
                  <a href={url.url} className="text-xs hover:underline">
                    {url.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {notification.notificationErrors.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold mb-0">{t('errors')}</p>
            <ul className="list-none p-0 m-0 max-h-64 overflow-y-auto">
              {notification.notificationErrors.map((error, i) => (
                <li key={i} className="text-xs text-destructive py-0.5">
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AppDialog>
  );
};
