/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getRoyaltyDealCards,
  getProfitShareDealCards,
  getPublisherDealCards,
  getDefaultCards,
} from '../statementCardConfigs';
import { i18n } from '@curveroyaltysystems/i18n';

type StatementViewConfig = {
  type: 'royalty' | 'profitShare' | 'publisher' | 'default';
  cards: any[];
  linkText: string;
};

/**
 * Determines statement view configuration based on user/client context:
 * - Royalty Deal: userType == 'payee' && clientType != 'Publisher' && contractType != 'Profit Share'
 * - Profit Share: userType == 'payee' && clientType != 'Publisher' && contractType == 'Profit Share'
 * - Publisher: userType == 'payee' && clientType == 'Publisher'
 */
export const getStatementViewConfig = (
  statement: any | undefined,
  userType: string | null,
  clientType: string | null
): StatementViewConfig | null => {
  if (!statement) return null;

  const t = (key: string) => i18n.t(key, { ns: 'dashboards' });
  const { contractType } = statement;
  const isPayee = userType === 'payee';
  const isPublisher = clientType === 'Publisher';
  const isProfitShare = contractType === 'Profit Share' || contractType === 'Profit Share - Flexible';

  // Royalty Deal: payee, non-publisher, non-profit-share
  if (isPayee && !isPublisher && !isProfitShare) {
    return {
      type: 'royalty',
      cards: getRoyaltyDealCards(statement),
      linkText: t('linkMoreInfo'),
    };
  }

  // Profit Share Deal: payee, non-publisher, profit-share
  if (isPayee && !isPublisher && isProfitShare) {
    return {
      type: 'profitShare',
      cards: getProfitShareDealCards(statement),
      linkText: t('linkFullPicture'),
    };
  }

  // Publisher Deal: payee, publisher
  if (isPayee && isPublisher) {
    return {
      type: 'publisher',
      cards: getPublisherDealCards(statement),
      linkText: t('linkMoreInfo'),
    };
  }

  // Default fallback
  return {
    type: 'default',
    cards: getDefaultCards(statement),
    linkText: t('linkMoreInfo'),
  };
};
