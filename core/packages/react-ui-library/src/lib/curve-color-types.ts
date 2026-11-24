/**
 * Curve Brand Color Types
 * Defines all available Curve brand colors for use across components
 *
 * This file provides type-safe color constants that map to Tailwind classes.
 * All color classes are explicitly defined to ensure Tailwind's scanner can detect them.
 */

// All available Curve colors from Tailwind theme
export const CURVE_COLORS = {
  PRIMARY: 'curve-primary',
  PRIMARY_DARK: 'curve-primary-dark',
  PRIMARY_DARKER: 'curve-primary-darker',
  PRIMARY_LIGHT: 'curve-primary-light',
  PRIMARY_LIGHTER: 'curve-primary-lighter',

  SUCCESS: 'curve-success',
  SUCCESS_DARK: 'curve-success-dark',
  SUCCESS_DARKER: 'curve-success-darker',
  SUCCESS_LIGHT: 'curve-success-light',
  SUCCESS_LIGHTER: 'curve-success-lighter',
  SUCCESS_GREEN: 'curve-success-green',
  SUCCESS_GREEN_DARK: 'curve-success-green-dark',

  COMPLETE: 'curve-complete',
  COMPLETE_DARK: 'curve-complete-dark',
  COMPLETE_DARKER: 'curve-complete-darker',
  COMPLETE_LIGHT: 'curve-complete-light',
  COMPLETE_LIGHTER: 'curve-complete-lighter',

  INFO: 'curve-info',
  INFO_DARK: 'curve-info-dark',
  INFO_DARKER: 'curve-info-darker',
  INFO_LIGHT: 'curve-info-light',
  INFO_LIGHTER: 'curve-info-lighter',

  DANGER: 'curve-danger',
  DANGER_DARK: 'curve-danger-dark',
  DANGER_DARKER: 'curve-danger-darker',
  DANGER_LIGHT: 'curve-danger-light',
  DANGER_LIGHTER: 'curve-danger-lighter',

  WARNING: 'curve-warning',
  WARNING_DARK: 'curve-warning-dark',
  WARNING_DARKER: 'curve-warning-darker',
  WARNING_LIGHT: 'curve-warning-light',
  WARNING_LIGHTER: 'curve-warning-lighter',

  MASTER: 'curve-master',
  MASTER_LIGHT: 'curve-master-light',
  MASTER_LIGHTER: 'curve-master-lighter',
  MASTER_LIGHTEST: 'curve-master-lightest',
  MASTER_DARK: 'curve-master-dark',
  MASTER_DARKER: 'curve-master-darker',
  MASTER_DARKEST: 'curve-master-darkest',
} as const;

// Type for all Curve colors
export type CurveColor = (typeof CURVE_COLORS)[keyof typeof CURVE_COLORS];

// Specific color groups for components that need restrictions
export const SUMMARY_CARD_COLORS = {
  PRIMARY: 'primary',
  SUCCESS: 'success',
  COMPLETE: 'complete',
  DANGER: 'danger',
  INFO: 'info',
  WARNING: 'warning',
} as const;

export type SummaryCardColor = (typeof SUMMARY_CARD_COLORS)[keyof typeof SUMMARY_CARD_COLORS];

// Mapping object for SummaryCard colors to Tailwind classes
// This ensures Tailwind can scan and include these classes
export const SUMMARY_CARD_COLOR_MAP: Record<SummaryCardColor, string> = {
  primary: 'bg-curve-primary',
  success: 'bg-curve-success-green',
  complete: 'bg-curve-complete',
  danger: 'bg-curve-danger',
  info: 'bg-curve-info',
  warning: 'bg-curve-warning',
} as const;
