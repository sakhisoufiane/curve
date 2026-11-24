import { useGetNotificationCount } from '@/hooks/notifications/useGetNotificationCount';
import { NotificationMenuItem } from './NotificationMenuItem';
import { useNotificationData } from '@/hooks/notifications/useNotificationData';
import type { Notification } from './types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Button,
  Flex,
} from '@curveroyaltysystems/react-ui-library';
import { useTranslation } from '@curveroyaltysystems/i18n';
import { NotificationMenuIcon } from './NotificationMenuIcon';

const NOTIFICATION_PAGE = 1;

export const NotificationMenu = () => {
  const { unreadNotificationCount, refetchNotificationCount } = useGetNotificationCount();
  const { notificationData, markNotificationRead, refetchNotificationData } = useNotificationData({
    page: NOTIFICATION_PAGE,
  });
  const { t } = useTranslation();

  const markAllAsReadClicked = () => {
    const unreadIds = notificationData
      .filter((notification: Notification) => !notification.read)
      .map((notification: Notification) => notification._id);
    if (unreadIds.length > 0) {
      markNotificationRead(unreadIds, {
        onSuccess: () => {
          refetchNotificationData();
          refetchNotificationCount();
        },
      });
    }
  };

  return (
    <DropdownMenu dir="ltr">
      <DropdownMenuTrigger asChild className="mr-1">
        <NotificationMenuIcon unreadNotificationCount={unreadNotificationCount} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-100 max-h-[240px] overflow-y-scroll bg-white [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-gray-400"
      >
        <Flex direction="row" justify="between" align="center" className="px-2 py-1">
          <span className="text-xs font-semibold">
            {t('notifications')} {unreadNotificationCount ? `(${unreadNotificationCount})` : ''}
          </span>
          <Button size="sm" variant="outline" onClick={markAllAsReadClicked}>
            {t('markAllAsRead')}
          </Button>
        </Flex>
        <DropdownMenuSeparator />
        {notificationData && notificationData.length > 0 ? (
          notificationData.map((notification: Notification) => (
            <>
              <NotificationMenuItem key={notification._id} {...notification} />
              <DropdownMenuSeparator className="h-3px bg-grey" />
            </>
          ))
        ) : (
          <DropdownMenuItem>{t('noNotifications')}</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
