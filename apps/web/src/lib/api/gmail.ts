/**
 * Gmail IMAP API module
 */

import { fetchApi } from '../api-client';

export interface GmailFetchLog {
  id: number;
  messageUid: string;
  subject: string | null;
  sender: string | null;
  receivedAt: string | null;
  attachmentName: string | null;
  savedFilePath: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GmailStatus {
  scheduler: {
    isRunning: boolean;
    schedule: string;
  };
  config: {
    email: string;
    enabled: boolean;
    targetFolder: string;
  } | null;
  stats: {
    total: number;
    downloaded: number;
    failed: number;
    lastFetchAt: string | null;
  };
}

export interface GmailFetchResult {
  success: boolean;
  totalEmails: number;
  downloaded: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export interface GmailTestResult {
  success: boolean;
  message: string;
}

export const gmailApi = {
  getStatus: () => fetchApi<GmailStatus>('/api/gmail/status'),

  manualFetch: () =>
    fetchApi<GmailFetchResult>('/api/gmail/fetch', {
      method: 'POST',
      body: '{}',
    }),

  getLogs: (limit = 50) =>
    fetchApi<GmailFetchLog[]>(`/api/gmail/logs?limit=${limit}`),

  testConnection: () =>
    fetchApi<GmailTestResult>('/api/gmail/test-connection', {
      method: 'POST',
      body: '{}',
    }),
};
