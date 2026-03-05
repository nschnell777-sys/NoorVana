import { format, parseISO } from 'date-fns';

/** Redemption rate constants: 1,000 points = $5.00 */
export const REDEMPTION_POINTS_PER_UNIT = 1000;
export const REDEMPTION_CREDIT_PER_UNIT = 5;
export const POINTS_PER_DOLLAR = REDEMPTION_POINTS_PER_UNIT / REDEMPTION_CREDIT_PER_UNIT; // 200

/** Calculates the dollar credit value for a given number of points */
export const pointsToDollars = (points) =>
  Math.floor(points / REDEMPTION_POINTS_PER_UNIT) * REDEMPTION_CREDIT_PER_UNIT;

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
 * Formats an ISO date string to a short readable format.
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
