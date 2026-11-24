import React from 'react';
import { Badge } from '@curveroyaltysystems/react-ui-library';

interface HeaderBadgesProps {
  isInTrial?: boolean;
  trialDaysLeft?: number;
}

export const HeaderBadges: React.FC<HeaderBadgesProps> = ({ isInTrial = false, trialDaysLeft = 0 }) => (
  <>{isInTrial && <Badge variant="default">{trialDaysLeft} days left in free trial</Badge>}</>
);
