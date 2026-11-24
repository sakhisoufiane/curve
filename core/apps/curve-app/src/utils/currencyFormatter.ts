/**
 * Formats a number as currency with proper symbol and locale formatting
 * @param value - The numeric value to format
 * @param currencyCode - The currency code (e.g., 'USD', 'GBP', 'EUR')
 * @param currencySymbol - The currency symbol (e.g., '$', '£', '€')
 * @param options - Additional formatting options
 * @returns Formatted currency string
 */
export const formatCurrency = (
  value: number | string | null | undefined,
  _currencyCode?: string | null,
  currencySymbol?: string | null,
  options: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    showSymbol?: boolean;
  } = {}
): string => {
  // Handle null/undefined values
  if (value === null || value === undefined || value === '') {
    return '0';
  }

  // Convert to number
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;

  // Handle invalid numbers
  if (isNaN(numericValue)) {
    return '0';
  }

  const { minimumFractionDigits = 2, maximumFractionDigits = 2, showSymbol = true } = options;

  // Format the number with locale-specific formatting
  const formattedNumber = numericValue.toLocaleString('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  });

  // Add currency symbol if requested and available
  if (showSymbol && currencySymbol) {
    return `${currencySymbol}${formattedNumber}`;
  }

  return formattedNumber;
};

/**
 * Formats a number as currency using the default USD symbol
 * @param value - The numeric value to format
 * @returns Formatted currency string with $ symbol
 */
export const formatCurrencyUSD = (value: number | string | null | undefined): string => {
  return formatCurrency(value, 'USD', '$');
};

/**
 * Formats a number as currency with no symbol (just formatted number)
 * @param value - The numeric value to format
 * @returns Formatted number string
 */
export const formatNumber = (value: number | string | null | undefined): string => {
  return formatCurrency(value, null, null, { showSymbol: false });
};
