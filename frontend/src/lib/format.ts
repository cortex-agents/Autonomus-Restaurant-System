import { formatDistanceToNowStrict, formatRelative, parseISO } from "date-fns";
import { enUS } from "date-fns/locale";

/**
 * Format a number as Pakistani Rupees currency
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format a date string to show relative time (e.g., "2 minutes ago")
 * Only shows relative time for today, otherwise shows date
 */
export const formatDateTime = (dateString: string): string => {
  const date = parseISO(dateString);
  const now = new Date();

  // If it's today, show relative time
  if (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  ) {
    return formatDistanceToNowStrict(date, { addSuffix: true, locale: enUS });
  }

  // Otherwise show the date
  return formatRelative(date, now, { locale: enUS });
};

/**
 * Format a date string to show just the date (e.g., "Jan 15, 2024")
 */
export const formatDate = (dateString: string): string => {
  const date = parseISO(dateString);
  return new Intl.DateTimeFormat("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

/**
 * Format a number with commas as thousands separators
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString("en-PK");
};