import { format, parseISO } from 'date-fns';

/**
 * Formats a number with locale-aware comma separators.
 * @param {number} num
 * @returns {string}
 */
export const formatPoints = (num) => {
  return (num || 0).toLocaleString();
};

/**
 * Formats a currency value.
 * @param {number} amount
 * @returns {string}
 */
export const formatCurrency = (amount) => {
  return `$${parseFloat(amount || 0).toFixed(2)}`;
};

/**
 * Formats an ISO date string to a readable format.
 * @param {string} dateStr
 * @returns {string}
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy h:mm a');
  } catch {
    return dateStr;
  }
};

/**
 * Formats an ISO date string to a short date format.
 * @param {string} dateStr
 * @returns {string}
 */
export const formatShortDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
};
