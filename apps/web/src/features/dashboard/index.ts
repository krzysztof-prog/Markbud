/**
 * Dashboard feature - public exports
 */

// Main dashboard
export { dashboardApi } from './api/dashboardApi';
export { DashboardContent } from './components/DashboardContent';
export { useDashboard, useAlerts, useInvalidateDashboard } from './hooks/useDashboard';

// Operator dashboard (nowy z prawdziwymi danymi)
export { operatorDashboardApi } from './api/operatorDashboardApi';
export type {
  OperatorDashboardResponse,
  CompletenessStats,
  RecentActivity,
  OperatorAlert,
} from './api/operatorDashboardApi';
export { NewOperatorDashboard } from './components/NewOperatorDashboard';
export {
  useOperatorDashboard,
  useOperatorDashboardFilter,
  useInvalidateOperatorDashboard,
  calculateCompletenessPercent,
  countProblems,
} from './hooks/useOperatorDashboard';
