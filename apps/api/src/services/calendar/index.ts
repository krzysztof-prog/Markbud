/**
 * Calendar Services - Eksport głównych komponentów kalendarza
 *
 * Moduł odpowiada za:
 * - Obliczanie świąt polskich
 * - Logikę dni roboczych
 * - Algorytm obliczania Wielkanocy
 */

// Main calendar service
export { CalendarService, getCalendarService } from './CalendarService.js';
export type { Holiday } from './CalendarService.js';

// Easter calculator
export { EasterCalculator, easterCalculator } from './utils/EasterCalculator.js';
export type { MovableHoliday } from './utils/EasterCalculator.js';
