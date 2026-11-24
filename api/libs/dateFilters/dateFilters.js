/**
 * Check if a date string is date-only (no time component)
 * @param {string} dateString - The date string to check
 * @returns {boolean} - True if date-only format (YYYY-MM-DD)
 */
function isDateOnly(dateString) {
  // Match YYYY-MM-DD format exactly (no time component)
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
}

/**
 * Normalizes a date string to the start of the day (00:00:00.000 UTC)
 * If a full datetime is passed, preserves the original time.
 *
 * @param {string} dateString - Date string to normalize
 * @returns {Date|null} Normalized date or null if invalid
 */
function normalizeToStartOfDay(dateString) {
  if (!dateString || typeof dateString !== 'string' || dateString.trim() === '') {
    return null;
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  // Only normalize to start of day if date-only string; preserve time for full datetime
  if (isDateOnly(dateString)) {
    date.setUTCHours(0, 0, 0, 0);
  }
  return date;
}

/**
 * Normalizes a date string to the end of the day (23:59:59.999 UTC)
 * If a full datetime is passed, preserves the original time.
 *
 * @param {string} dateString - Date string to normalize
 * @returns {Date|null} Normalized date or null if invalid
 */
function normalizeToEndOfDay(dateString) {
  if (!dateString || typeof dateString !== 'string' || dateString.trim() === '') {
    return null;
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  // Only normalize to end of day if date-only string; preserve time for full datetime
  if (isDateOnly(dateString)) {
    date.setUTCHours(23, 59, 59, 999);
  }
  return date;
}

/**
 * Builds a MongoDB date range filter
 *
 * @param {Date|null} date - Date to filter by
 * @param {'after'|'before'} direction - Filter direction
 * @returns {Object} MongoDB filter object
 */
function buildDateRangeFilter(date, direction) {
  if (!date || !(date instanceof Date)) {
    return {};
  }

  if (direction === 'after') {
    return { $gte: date };
  }

  if (direction === 'before') {
    return { $lte: date };
  }

  return {};
}

/**
 * Applies date filters to MongoDB query params
 *
 * @param {Object} inputParams - Request query parameters
 * @param {Object} params - Existing MongoDB query params
 * @returns {Object} Updated params with date filters
 */
function applyDateFilters(inputParams, params) {
  const result = { ...params };

  // Handle createdAt filters
  if (inputParams.createdAfter) {
    const normalizedDate = normalizeToStartOfDay(inputParams.createdAfter);
    if (normalizedDate) {
      result.createdAt = {
        ...result.createdAt,
        ...buildDateRangeFilter(normalizedDate, 'after'),
      };
    }
  }

  if (inputParams.createdBefore) {
    const normalizedDate = normalizeToEndOfDay(inputParams.createdBefore);
    if (normalizedDate) {
      result.createdAt = {
        ...result.createdAt,
        ...buildDateRangeFilter(normalizedDate, 'before'),
      };
    }
  }

  // Handle updatedAt filters
  if (inputParams.updatedAfter) {
    const normalizedDate = normalizeToStartOfDay(inputParams.updatedAfter);
    if (normalizedDate) {
      result.updatedAt = {
        ...result.updatedAt,
        ...buildDateRangeFilter(normalizedDate, 'after'),
      };
    }
  }

  if (inputParams.updatedBefore) {
    const normalizedDate = normalizeToEndOfDay(inputParams.updatedBefore);
    if (normalizedDate) {
      result.updatedAt = {
        ...result.updatedAt,
        ...buildDateRangeFilter(normalizedDate, 'before'),
      };
    }
  }

  return result;
}

module.exports = {
  isDateOnly,
  normalizeToStartOfDay,
  normalizeToEndOfDay,
  buildDateRangeFilter,
  applyDateFilters,
};
