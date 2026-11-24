/* eslint-disable @typescript-eslint/no-explicit-any */
import { i18n } from '@curveroyaltysystems/i18n';

type SummaryCardConfig = {
  title: string;
  value: number;
  color: 'primary' | 'success' | 'complete' | 'danger' | 'info' | 'warning';
};

const t = (key: string) => i18n.t(key, { ns: 'dashboards' });

/**
 * Creates card configuration for Royalty Deal statements
 */
export const getRoyaltyDealCards = (statement: any): SummaryCardConfig[] => [
  {
    title: t('openingBalance'),
    value: statement.openingBalance || 0,
    color: 'info',
  },
  {
    title: t('netRevenue'),
    value: statement.netAmount || 0,
    color: 'complete',
  },
  {
    title: t('netCosts'),
    value: statement.netCosts || 0,
    color: 'primary',
  },
  {
    title: t('reservesWithheld'),
    value: statement.reservesWithheld || 0,
    color: 'info',
  },
  {
    title: t('reservesReleased'),
    value: statement.reservesReleased || 0,
    color: 'info',
  },
  {
    title: t('closingBalance'),
    value: statement.closingBalance || 0,
    color: 'success',
  },
];

/**
 * Creates card configuration for Profit Share Deal statements
 */
export const getProfitShareDealCards = (statement: any): SummaryCardConfig[] => {
  const earningThisPeriod =
    (statement.netAmount || 0) -
    (statement.netCosts || 0) -
    (statement.reservesWithheld || 0) +
    (statement.reservesReleased || 0);
  const advanceRemaining =
    (statement.profitShareUnrecoupedAdvanceStart || 0) + (statement.profitShareAdvanceRecouped || 0);

  return [
    {
      title: t('openingBalance'),
      value: statement.openingBalance || 0,
      color: 'success',
    },
    {
      title: t('earningThisPeriod'),
      value: earningThisPeriod,
      color: 'complete',
    },
    {
      title: t('recoupedAdvance'),
      value: statement.profitShareAdvanceRecouped || 0,
      color: 'info',
    },
    {
      title: t('advanceRemaining'),
      value: advanceRemaining,
      color: 'info',
    },
    {
      title: t('profitShareNetAmount'),
      value: statement.profitShareNetAmount || 0,
      color: 'primary',
    },
    {
      title: t('closingBalance'),
      value: statement.closingBalance || 0,
      color: 'success',
    },
  ];
};

/**
 * Creates card configuration for Publisher Deal statements
 */
export const getPublisherDealCards = (statement: any): SummaryCardConfig[] => [
  {
    title: t('openingBalance'),
    value: statement.openingBalance || 0,
    color: 'info',
  },
  {
    title: t('netRevenue'),
    value: statement.netAmount || 0,
    color: 'complete',
  },
  {
    title: t('closingBalance'),
    value: statement.closingBalance || 0,
    color: 'success',
  },
];

/**
 * Creates default card configuration for statements that don't match specific criteria
 */
export const getDefaultCards = (statement: any): SummaryCardConfig[] => [
  {
    title: t('openingBalance'),
    value: statement.openingBalance || 0,
    color: 'info',
  },
  {
    title: t('closingBalance'),
    value: statement.closingBalance || 0,
    color: 'success',
  },
];
