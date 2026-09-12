import client from './client';
import { mapCoordinatorDashboard, mapCoordinatorDepartments } from '../utils/naacMappers';

export async function fetchCoordinatorDashboard(cycleId) {
  const { data } = await client.get('/coordinator/dashboard', {
    params: cycleId ? { cycle_id: cycleId } : undefined,
  });
  return mapCoordinatorDashboard(data);
}

export async function fetchCoordinatorDepartments(cycleId) {
  const { data } = await client.get('/coordinator/departments', {
    params: cycleId ? { cycle_id: cycleId } : undefined,
  });
  return mapCoordinatorDepartments(data);
}

export async function fetchDepartmentCriteriaBreakdown(departmentId, cycleId) {
  const { data } = await client.get(
    `/coordinator/departments/${departmentId}/criteria-breakdown`,
    { params: cycleId ? { cycle_id: cycleId } : undefined },
  );
  return data ?? [];
}
