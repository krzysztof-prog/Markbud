/**
 * Production Planning API - Planowanie produkcji
 */
import { fetchApi } from '@/lib/api-client';

// === Types ===

export interface EfficiencyConfig {
  id: number;
  clientType: string;
  name: string;
  glazingsPerHour: number;
  wingsPerHour: number;
  coefficient: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface EfficiencyConfigInput {
  clientType: string;
  name: string;
  glazingsPerHour: number;
  wingsPerHour: number;
  coefficient?: number;
  isActive?: boolean;
  sortOrder?: number;
}

export interface ProfileWithPalletized {
  id: number;
  name: string;
  code: string;
  isPalletized: boolean;
}

export interface ColorWithTypical {
  id: number;
  name: string;
  code: string;
  isTypical: boolean;
}

// === Efficiency Configs API ===

export async function getEfficiencyConfigs(): Promise<EfficiencyConfig[]> {
  return fetchApi<EfficiencyConfig[]>('/api/production-planning/efficiency-configs');
}

export async function getEfficiencyConfig(id: number): Promise<EfficiencyConfig> {
  return fetchApi<EfficiencyConfig>(`/api/production-planning/efficiency-configs/${id}`);
}

export async function createEfficiencyConfig(data: EfficiencyConfigInput): Promise<EfficiencyConfig> {
  return fetchApi<EfficiencyConfig>('/api/production-planning/efficiency-configs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateEfficiencyConfig(id: number, data: Partial<EfficiencyConfigInput>): Promise<EfficiencyConfig> {
  return fetchApi<EfficiencyConfig>(`/api/production-planning/efficiency-configs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteEfficiencyConfig(id: number): Promise<void> {
  return fetchApi<void>(`/api/production-planning/efficiency-configs/${id}`, {
    method: 'DELETE',
  });
}

// === Profile Palletized API ===

export async function getProfilesWithPalletized(): Promise<ProfileWithPalletized[]> {
  return fetchApi<ProfileWithPalletized[]>('/api/production-planning/profiles/palletized');
}

export async function updateProfilePalletized(id: number, isPalletized: boolean): Promise<ProfileWithPalletized> {
  return fetchApi<ProfileWithPalletized>(`/api/production-planning/profiles/${id}/palletized`, {
    method: 'PATCH',
    body: JSON.stringify({ isPalletized }),
  });
}

export async function bulkUpdateProfilePalletized(profiles: { id: number; isPalletized: boolean }[]): Promise<{ success: boolean; updated: number }> {
  return fetchApi<{ success: boolean; updated: number }>('/api/production-planning/profiles/palletized/bulk', {
    method: 'PATCH',
    body: JSON.stringify({ profiles }),
  });
}

// === Color Typical API ===

export async function getColorsWithTypical(): Promise<ColorWithTypical[]> {
  return fetchApi<ColorWithTypical[]>('/api/production-planning/colors/typical');
}

export async function updateColorTypical(id: number, isTypical: boolean): Promise<ColorWithTypical> {
  return fetchApi<ColorWithTypical>(`/api/production-planning/colors/${id}/typical`, {
    method: 'PATCH',
    body: JSON.stringify({ isTypical }),
  });
}

export async function bulkUpdateColorTypical(colors: { id: number; isTypical: boolean }[]): Promise<{ success: boolean; updated: number }> {
  return fetchApi<{ success: boolean; updated: number }>('/api/production-planning/colors/typical/bulk', {
    method: 'PATCH',
    body: JSON.stringify({ colors }),
  });
}
