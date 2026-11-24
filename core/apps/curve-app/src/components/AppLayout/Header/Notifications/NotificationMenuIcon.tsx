import { forwardRef } from 'react';
import { Icon } from '@curveroyaltysystems/react-ui-library';
import { Button, Badge } from '@curveroyaltysystems/react-ui-library';

export const NotificationMenuIcon = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Button> & { unreadNotificationCount: number }
>(({ unreadNotificationCount, ...props }, ref) => {
  return (
    <Button ref={ref} variant="outline" size="icon" aria-label="Open notifications" className="relative" {...props}>
      <Icon.Bell size={32} />
      {unreadNotificationCount > 0 && (
        <Badge
          variant="destructive"
          className="text-white absolute -bottom-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full p-0 text-[10px] font-bold leading-none"
        >
          {unreadNotificationCount}
        </Badge>
      )}
    </Button>
  );
});
