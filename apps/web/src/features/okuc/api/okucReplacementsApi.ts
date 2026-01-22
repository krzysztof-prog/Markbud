/**
 * Okuc Replacements API Client
 *
 * Backend routes: apps/api/src/routes/okuc/replacements.ts
 * Backend validators: apps/api/src/validators/okuc.ts
 *
 * Zarządzanie zastępstwami artykułów (wygaszanie starych, przejmowanie przez nowe)
 */

import { fetchApi } from '@/lib/api-client';
import type {
  ArticleReplacement,
  SetReplacementInput,
  TransferDemandResult,
} from '@/types/okuc';

export const okucReplacementsApi = {
  /**
   * GET /api/okuc/replacements
   * Pobierz listę wszystkich mapowań zastępstw
   */
  getAll: () =>
    fetchApi<ArticleReplacement[]>('/api/okuc/replacements'),

  /**
   * POST /api/okuc/replacements
   * Ustaw lub zmień mapowanie zastępstwa
   *
   * @param data.oldArticleId - ID artykułu wygaszanego
   * @param data.newArticleId - ID artykułu zastępującego (null = usuń mapowanie)
   */
  set: (data: SetReplacementInput) =>
    fetchApi<ArticleReplacement>('/api/okuc/replacements', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * DELETE /api/okuc/replacements/:id
   * Usuń mapowanie zastępstwa (cofnij wygaszanie)
   *
   * @param oldArticleId - ID artykułu wygaszanego (database ID)
   */
  remove: (oldArticleId: number) =>
    fetchApi<ArticleReplacement>(`/api/okuc/replacements/${oldArticleId}`, {
      method: 'DELETE',
    }),

  /**
   * POST /api/okuc/replacements/:id/transfer
   * Ręcznie przenieś zapotrzebowanie z artykułu wygaszanego na zamiennik
   *
   * @param oldArticleId - ID artykułu wygaszanego (database ID)
   */
  transferDemand: (oldArticleId: number) =>
    fetchApi<TransferDemandResult>(`/api/okuc/replacements/${oldArticleId}/transfer`, {
      method: 'POST',
    }),
};
