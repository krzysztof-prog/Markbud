/**
 * Import validation schemas
 */

import { z } from 'zod';
import { idParamsSchema } from './common.js';

export const importParamsSchema = idParamsSchema('import');

export const importQuerySchema = z.object({
  status: z.string().optional(),
});

export const approveImportSchema = z.object({
  action: z.enum(['overwrite', 'add_new']).optional().default('add_new'),
  replaceBase: z.boolean().optional().default(false),
});

export const folderImportSchema = z.object({
  folderPath: z.string().min(1, 'Folder path is required'),
  deliveryNumber: z.enum(['I', 'II', 'III'], {
    errorMap: () => ({ message: 'Delivery number must be I, II or III' }),
  }),
});

export const scanFolderQuerySchema = z.object({
  folderPath: z.string().min(1, 'Folder path is required'),
});

// Type exports
export type ImportParams = z.infer<typeof importParamsSchema>;
export type ImportQuery = z.infer<typeof importQuerySchema>;
export type ApproveImportInput = z.infer<typeof approveImportSchema>;
export type FolderImportInput = z.infer<typeof folderImportSchema>;
export type ScanFolderQuery = z.infer<typeof scanFolderQuerySchema>;
