/**
 * Bug Report Validators - Zod schemas
 */

import { z } from 'zod';

// Schema dla zgłoszenia błędu
export const bugReportSchema = z.object({
  url: z.string().min(1, 'URL jest wymagany'),
  userAgent: z.string().min(1, 'UserAgent jest wymagany'),
  timestamp: z.string().min(1, 'Timestamp jest wymagany'),
  description: z
    .string()
    .min(10, 'Opis musi mieć minimum 10 znaków')
    .max(5000, 'Opis może mieć maksymalnie 5000 znaków'),
  screenshot: z.string().optional(), // Base64 encoded screenshot (opcjonalnie)
});

// Schema dla query params GET /bug-reports
export const bugReportQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 50;
      const num = parseInt(val, 10);
      if (isNaN(num) || num < 1) return 50;
      return Math.min(num, 100);
    }),
});

// Type exports
export type BugReportInput = z.infer<typeof bugReportSchema>;
export type BugReportQuery = z.infer<typeof bugReportQuerySchema>;
