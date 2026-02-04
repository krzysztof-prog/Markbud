/**
 * API client dla systemu pomocy
 */

import { fetchBlob } from '@/lib/api-client';

export const helpApi = {
  /**
   * Pobierz PDF instrukcji dla danej strony
   */
  async downloadPdf(pageId: string): Promise<void> {
    const blob = await fetchBlob(`/help/pdf/${pageId}`);

    // Utwórz link do pobrania
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `instrukcja_${pageId}_${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
