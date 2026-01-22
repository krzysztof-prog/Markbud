/**
 * API dla kolorów prywatnych (zewnętrznych)
 */

import { fetchApi } from '@/lib/api-client';

export interface PrivateColor {
  id: number;
  code: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

export interface UpdatePrivateColorData {
  name: string;
}

/**
 * Pobiera listę wszystkich kolorów prywatnych
 */
export async function getPrivateColors(): Promise<PrivateColor[]> {
  return fetchApi<PrivateColor[]>('/api/private-colors');
}

/**
 * Aktualizuje nazwę koloru prywatnego
 */
export async function updatePrivateColor(
  id: number,
  data: UpdatePrivateColorData
): Promise<PrivateColor> {
  return fetchApi<PrivateColor>(`/api/private-colors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Usuwa kolor prywatny (tylko jeśli nie jest używany)
 */
export async function deletePrivateColor(id: number): Promise<void> {
  await fetchApi(`/api/private-colors/${id}`, { method: 'DELETE' });
}
