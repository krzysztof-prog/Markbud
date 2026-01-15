/**
 * Dashboard API module
 */

import type { DashboardResponse, Alert } from '@/types';
import { fetchApi } from '../api-client';

// Dashboard
export const dashboardApi = {
  getDashboard: () => fetchApi<DashboardResponse>('/api/dashboard'),
  getAlerts: () => fetchApi<Alert[]>('/api/dashboard/alerts'),
};
