/**
 * Accessibility helpers for focus management, keyboard navigation, and ARIA attributes
 */

export const FOCUS_RING = 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';
export const FOCUS_RING_INSET = 'focus:outline-none focus:ring-2 focus:ring-blue-500';

export const handleEscapeKey = (callback: () => void) => {
  return (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      callback();
    }
  };
};

export const handleEnterOrSpace = (callback: () => void) => {
  return (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  };
};

export const generateUniqueId = (prefix: string = 'id') => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};
