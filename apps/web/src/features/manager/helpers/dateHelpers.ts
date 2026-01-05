/**
 * Date formatting utilities for manager feature
 */

/**
 * Format date to Polish locale (DD.MM.YYYY)
 * @param date - Date string, Date object, null or undefined
 * @returns Formatted date string or '-' if no date
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('pl-PL');
};

/**
 * Check if date is overdue (past today)
 * @param date - Date string, Date object, null or undefined
 * @returns true if date is in the past, false otherwise
 */
export const isOverdue = (date: string | Date | null | undefined): boolean => {
  if (!date) return false;
  const deadline = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  return deadline < today;
};

/**
 * Get today's date in YYYY-MM-DD format
 * @returns Today's date string
 */
export const getTodayISOString = (): string => {
  return new Date().toISOString().split('T')[0];
};
