/**
 * Akrobud Verification List validation schemas
 *
 * Walidatory dla funkcji weryfikacji list dostaw Akrobud
 */

import { z } from 'zod';
import { dateSchema, idParamsSchema } from './common.js';

/**
 * Schema tworzenia nowej listy weryfikacyjnej
 */
export const createVerificationListSchema = z.object({
  deliveryDate: dateSchema,
  title: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
});

/**
 * Schema aktualizacji listy
 */
export const updateVerificationListSchema = z.object({
  deliveryDate: dateSchema.optional(),
  title: z.string().max(200).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

/**
 * Schema pojedynczego elementu listy
 */
export const verificationItemSchema = z.object({
  orderNumber: z
    .string()
    .min(1, 'Numer zlecenia nie może być pusty')
    .max(20, 'Numer zlecenia zbyt długi')
    .trim(),
});

/**
 * Schema dodawania elementów do listy (batch)
 */
export const addItemsSchema = z.object({
  items: z
    .array(verificationItemSchema)
    .min(1, 'Musisz podać co najmniej jeden numer zlecenia')
    .max(100, 'Maksymalnie 100 zleceń na raz'),
  inputMode: z.enum(['textarea', 'single']),
});

/**
 * Schema parsowania tekstu z textarea
 */
export const parseTextareaSchema = z.object({
  text: z.string().min(1, 'Tekst nie może być pusty'),
});

/**
 * Schema weryfikacji listy
 */
export const verifyListSchema = z.object({
  createDeliveryIfMissing: z.boolean().default(false),
});

/**
 * Schema stosowania zmian
 */
export const applyChangesSchema = z.object({
  addMissing: z
    .array(z.number().int().positive())
    .default([]),
  removeExcess: z
    .array(z.number().int().positive())
    .default([]),
});

/**
 * Schema aktualizacji pozycji elementu
 */
export const updateItemPositionSchema = z.object({
  position: z.number().int().positive(),
});

/**
 * Schema obsługi duplikatów
 */
export const handleDuplicatesSchema = z.object({
  duplicates: z.array(
    z.object({
      orderNumber: z.string(),
      action: z.enum(['keep_first', 'keep_last', 'keep_all', 'remove_all']),
    })
  ),
});

// ID params
export const verificationListParamsSchema = idParamsSchema('verification list');
export const verificationItemParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid verification list ID'),
  itemId: z.string().regex(/^\d+$/, 'Invalid item ID'),
});

// Query schemas
export const verificationListQuerySchema = z.object({
  deliveryDate: z.string().optional(),
  status: z.enum(['draft', 'verified', 'applied']).optional(),
});

// ===================
// Project-based Schemas (NEW)
// ===================

/**
 * Schema parsowania treści maila (preview projektów)
 */
export const parseMailContentSchema = z.object({
  rawInput: z.string().min(1, 'Treść maila nie może być pusta'),
});

/**
 * Schema preview projektów (przed zapisem)
 */
export const previewProjectsSchema = z.object({
  projects: z
    .array(
      z.string()
        .min(1)
        .max(10)
        .regex(/^[A-Z]\d{3,5}$/i, 'Nieprawidłowy format numeru projektu')
    )
    .min(1, 'Musisz podać co najmniej jeden projekt')
    .max(50, 'Maksymalnie 50 projektów na raz'),
});

/**
 * Schema tworzenia nowej wersji listy opartej na projektach
 */
export const createListVersionSchema = z.object({
  deliveryDate: dateSchema,
  rawInput: z.string().min(1, 'Treść maila nie może być pusta'),
  projects: z
    .array(
      z.string()
        .min(1)
        .max(10)
        .regex(/^[A-Z]\d{3,5}$/i, 'Nieprawidłowy format numeru projektu')
    )
    .min(1, 'Musisz podać co najmniej jeden projekt')
    .max(50, 'Maksymalnie 50 projektów na raz'),
  parentId: z.number().int().positive().optional(),
});

/**
 * Schema porównywania wersji
 */
export const compareVersionsSchema = z.object({
  listId1: z.number().int().positive(),
  listId2: z.number().int().positive(),
});

/**
 * Schema weryfikacji listy projektów
 */
export const verifyProjectListSchema = z.object({
  createDeliveryIfMissing: z.boolean().default(false),
});

/**
 * Query dla pobierania wersji listy
 */
export const listVersionsQuerySchema = z.object({
  deliveryDate: dateSchema,
});

// Type exports
export type CreateVerificationListInput = z.infer<typeof createVerificationListSchema>;
export type UpdateVerificationListInput = z.infer<typeof updateVerificationListSchema>;
export type AddItemsInput = z.infer<typeof addItemsSchema>;
export type ParseTextareaInput = z.infer<typeof parseTextareaSchema>;
export type VerifyListInput = z.infer<typeof verifyListSchema>;
export type ApplyChangesInput = z.infer<typeof applyChangesSchema>;
export type UpdateItemPositionInput = z.infer<typeof updateItemPositionSchema>;
export type HandleDuplicatesInput = z.infer<typeof handleDuplicatesSchema>;
export type VerificationListParams = z.infer<typeof verificationListParamsSchema>;
export type VerificationItemParams = z.infer<typeof verificationItemParamsSchema>;
export type VerificationListQuery = z.infer<typeof verificationListQuerySchema>;

// Type exports (NEW)
export type ParseMailContentInput = z.infer<typeof parseMailContentSchema>;
export type PreviewProjectsInput = z.infer<typeof previewProjectsSchema>;
export type CreateListVersionInput = z.infer<typeof createListVersionSchema>;
export type CompareVersionsInput = z.infer<typeof compareVersionsSchema>;
export type VerifyProjectListInput = z.infer<typeof verifyProjectListSchema>;
export type ListVersionsQuery = z.infer<typeof listVersionsQuerySchema>;
