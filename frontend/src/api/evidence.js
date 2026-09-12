import client from './client';
import { mapEvidenceDocument, mapEvidenceList } from '../utils/naacMappers';

export async function listEvidence({ cycleId, status, criterionId, departmentId, q } = {}) {
  const params = {};
  if (cycleId) params.cycle_id = cycleId;
  if (status && status !== 'all') params.status = status;
  if (criterionId) params.criterion_id = criterionId;
  if (departmentId) params.department_id = departmentId;
  if (q) params.q = q;

  const { data } = await client.get('/evidence', { params });
  return mapEvidenceList(data);
}

export async function updateEvidenceStatus(evidenceId, { status, notes }) {
  const { data } = await client.patch(`/evidence/${evidenceId}/status`, { status, notes });
  return mapEvidenceDocument(data);
}
