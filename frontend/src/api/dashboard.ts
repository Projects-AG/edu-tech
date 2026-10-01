import api from "./axios";

export interface DashboardSummary {
  institution_id: string;
  department_count: number;
  user_count: number;
  file_upload_count: number;
}

export const dashboardApi = {
  summary: () => api.get<DashboardSummary>("/dashboard/summary"),
};
