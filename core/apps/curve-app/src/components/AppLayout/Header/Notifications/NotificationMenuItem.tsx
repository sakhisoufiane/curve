import { useState } from 'react';
import { Icon } from '@curveroyaltysystems/react-ui-library';
import { Flex } from '@curveroyaltysystems/react-ui-library';
import { formatTimeAgo } from '../../../../utils/time';
import { NotificationErrorsDialog } from './NotificationErrorsDialog';
import type { Notification } from './types';

export const NotificationMenuItem = ({
  _id,
  description,
  createdAt,
  name,
  link,
  read,
  notificationErrors,
  urls,
}: Notification) => {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const hasLink = !!link;
  const hasDetails = notificationErrors.length > 0 || urls.length > 0;

  return (
    <>
      <Flex direction="col" className={`px-3 py-2 w-full ${!read ? 'bg-muted' : ''}`}>
        <Flex direction="row" justify="between" align="center" className="w-full">
          <Flex direction="row" align="center" gap="xs" className="flex-1">
            {hasDetails ? (
              <button
                onClick={() => setDetailsOpen(true)}
                className="text-xs font-semibold mb-0 text-left hover:underline cursor-pointer bg-transparent border-none p-0"
              >
                {name}
              </button>
            ) : (
              <a href={link} className="text-xs font-semibold mb-0">
                {name}
              </a>
            )}
            <p className="text-[10px] text-muted-foreground mb-0">{formatTimeAgo(createdAt)}</p>
          </Flex>
          {hasDetails && (
            <button
              onClick={() => setDetailsOpen(true)}
              className="text-muted-foreground hover:opacity-70 ml-auto bg-transparent border-none p-0 cursor-pointer"
              title="View details"
            >
              <Icon.Eye className="w-3 h-3" />
            </button>
          )}
          {!hasDetails && hasLink && (
            <a href={link} className="text-muted-foreground hover:opacity-70 ml-auto" title="Download">
              <Icon.Download className="w-3 h-3" />
            </a>
          )}
        </Flex>
        <p className="mb-0 mt-0.5 text-xs text-muted-foreground">{description}</p>
      </Flex>
      {hasDetails && (
        <NotificationErrorsDialog
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          notification={{ _id, description, createdAt, name, link, read, notificationErrors, urls }}
        />
      )}
    </>
  );
};
