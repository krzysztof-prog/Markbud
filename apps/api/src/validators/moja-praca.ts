import { z } from 'zod';

// ============================================
// Query schemas
// ============================================

// Query dla listy konfliktów
export const conflictsQuerySchema = z.object({
  status: z.enum(['pending', 'resolved', 'all']).optional().default('pending'),
});

// Query dla zleceń/dostaw/szyb (data)
export const dateQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data musi być w formacie YYYY-MM-DD')
    .optional(),
});

// ============================================
// Params schemas
// ============================================

// Parametry dla szczegółu konfliktu
export const conflictIdParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID musi być liczbą'),
});

// ============================================
// Body schemas
// ============================================

// Body dla rozwiązania konfliktu
export const conflictResolutionSchema = z.object({
  action: z.enum(['replace_base', 'replace_variant', 'keep_both', 'cancel'], {
    required_error: 'Akcja jest wymagana',
    invalid_type_error: 'Nieprawidłowa akcja',
  }),
  targetOrderNumber: z.string().optional(), // Który wariant zastąpić (jeśli replace_variant)
  notes: z.string().max(500, 'Notatka może mieć max 500 znaków').optional(),
});

// Body dla zbiorczego rozwiązania konfliktów
export const bulkConflictResolutionSchema = z.object({
  ids: z.array(z.number()).min(1, 'Wymagane co najmniej jedno ID'),
  action: z.enum(['replace_base', 'replace_variant', 'keep_both', 'cancel'], {
    required_error: 'Akcja jest wymagana',
    invalid_type_error: 'Nieprawidłowa akcja',
  }),
});

// ============================================
// Response types
// ============================================

// Konflikt w liście
export const conflictListItemSchema = z.object({
  id: z.number(),
  orderNumber: z.string(),
  baseOrderNumber: z.string(),
  suffix: z.string(),
  documentAuthor: z.string().nullable(),
  filename: z.string(),
  existingWindowsCount: z.number().nullable(),
  existingGlassCount: z.number().nullable(),
  newWindowsCount: z.number().nullable(),
  newGlassCount: z.number().nullable(),
  systemSuggestion: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
});

// Szczegóły konfliktu z danymi bazowego zlecenia
export const conflictDetailSchema = conflictListItemSchema.extend({
  baseOrder: z.object({
    id: z.number(),
    orderNumber: z.string(),
    client: z.string().nullable(),
    project: z.string().nullable(),
    status: z.string(),
    totalWindows: z.number().nullable(),
    totalGlasses: z.number().nullable(),
    createdAt: z.string(),
  }),
  parsedData: z.any(), // JSON z ParsedUzyteBele
});

// Licznik konfliktów
export const conflictsCountSchema = z.object({
  pending: z.number(),
  total: z.number(),
});

// ============================================
// Type exports
// ============================================

export type ConflictsQuery = z.infer<typeof conflictsQuerySchema>;
export type DateQuery = z.infer<typeof dateQuerySchema>;
export type ConflictIdParams = z.infer<typeof conflictIdParamsSchema>;
export type ConflictResolutionInput = z.infer<typeof conflictResolutionSchema>;
export type BulkConflictResolutionInput = z.infer<typeof bulkConflictResolutionSchema>;
export type ConflictListItem = z.infer<typeof conflictListItemSchema>;
export type ConflictDetail = z.infer<typeof conflictDetailSchema>;
export type ConflictsCount = z.infer<typeof conflictsCountSchema>;
