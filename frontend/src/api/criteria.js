import client from './client';
import { mapCriteriaList } from '../utils/naacMappers';

export async function listCriteria(cycleId) {
  const { data } = await client.get('/criteria', {
    params: cycleId ? { cycle_id: cycleId } : undefined,
  });
  return mapCriteriaList(data);
}

export async function getCriterion(criterionId) {
  const { data } = await client.get(`/criteria/${criterionId}`);
  return data;
}
