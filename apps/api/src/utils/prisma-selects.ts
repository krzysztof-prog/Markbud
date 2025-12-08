/**
 * Prisma Select Constants
 *
 * Reusable select clauses for common entity patterns.
 * Eliminates duplication across routes, repositories, and handlers.
 */

/**
 * Basic profile select (id, number, name)
 * Used in ~10 places across the codebase
 */
export const profileBasicSelect = {
  id: true,
  number: true,
  name: true,
} as const;

/**
 * Extended profile select with description
 */
export const profileExtendedSelect = {
  id: true,
  number: true,
  name: true,
  description: true,
} as const;

/**
 * Basic color select (id, code)
 * Used for minimal color info
 */
export const colorMinimalSelect = {
  id: true,
  code: true,
} as const;

/**
 * Standard color select (id, code, name)
 * Most commonly used color select
 */
export const colorBasicSelect = {
  id: true,
  code: true,
  name: true,
} as const;

/**
 * Extended color select with type and hex
 */
export const colorExtendedSelect = {
  id: true,
  code: true,
  name: true,
  type: true,
  hexColor: true,
} as const;

/**
 * Order basic select (id, orderNumber)
 */
export const orderBasicSelect = {
  id: true,
  orderNumber: true,
} as const;

/**
 * Order summary select for lists
 */
export const orderSummarySelect = {
  id: true,
  orderNumber: true,
  status: true,
  valuePln: true,
  valueEur: true,
} as const;

/**
 * Delivery basic select
 */
export const deliveryBasicSelect = {
  id: true,
  deliveryDate: true,
  deliveryNumber: true,
  status: true,
} as const;

/**
 * Profile color select for warehouse/requirements
 */
export const profileColorSelect = {
  profile: {
    select: profileBasicSelect,
  },
  color: {
    select: colorBasicSelect,
  },
} as const;

/**
 * Window basic select
 */
export const windowBasicSelect = {
  id: true,
  widthMm: true,
  heightMm: true,
  quantity: true,
} as const;

// Type exports for TypeScript
export type ProfileBasicSelect = typeof profileBasicSelect;
export type ProfileExtendedSelect = typeof profileExtendedSelect;
export type ColorMinimalSelect = typeof colorMinimalSelect;
export type ColorBasicSelect = typeof colorBasicSelect;
export type ColorExtendedSelect = typeof colorExtendedSelect;
export type OrderBasicSelect = typeof orderBasicSelect;
export type OrderSummarySelect = typeof orderSummarySelect;
export type DeliveryBasicSelect = typeof deliveryBasicSelect;
