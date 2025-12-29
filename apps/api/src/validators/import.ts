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
  userId: z.number().optional(),
});

export const scanFolderQuerySchema = z.object({
  folderPath: z.string().min(1, 'Folder path is required'),
});

export const previewByFilepathQuerySchema = z.object({
  filepath: z.string().min(1, 'Filepath is required'),
});

export const processImportSchema = z.object({
  filepath: z.string().min(1, 'Filepath is required'),
  deliveryNumber: z.enum(['I', 'II', 'III']).optional(),
  resolution: z
    .discriminatedUnion('type', [
      z.object({
        type: z.literal('merge'),
        targetOrderNumber: z.string(),
      }),
      z.object({
        type: z.literal('replace'),
        targetOrderNumber: z.string(),
      }),
      z.object({
        type: z.literal('use_latest'),
        deleteOlder: z.boolean(),
      }),
      z.object({
        type: z.literal('keep_both'),
      }),
      z.object({
        type: z.literal('cancel'),
      }),
    ])
    .optional(),
});

// Type exports
export type ImportParams = z.infer<typeof importParamsSchema>;
export type ImportQuery = z.infer<typeof importQuerySchema>;
export type ApproveImportInput = z.infer<typeof approveImportSchema>;
export type FolderImportInput = z.infer<typeof folderImportSchema>;
export type ScanFolderQuery = z.infer<typeof scanFolderQuerySchema>;
export type PreviewByFilepathQuery = z.infer<typeof previewByFilepathQuerySchema>;
export type ProcessImportInput = z.infer<typeof processImportSchema>;
