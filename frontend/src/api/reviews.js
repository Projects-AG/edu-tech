import client from './client';
import { mapReviewList, mapSubmission } from '../utils/naacMappers';

export async function listReviewQueue({ cycleId, status, q } = {}) {
  const params = {};
  if (cycleId) params.cycle_id = cycleId;
  if (status && status !== 'all') params.status = status;
  if (q) params.q = q;

  const { data } = await client.get('/reviews/queue', { params });
  return mapReviewList(data);
}

export async function getReviewDetail(submissionId) {
  const { data } = await client.get(`/reviews/${submissionId}`);
  return mapSubmission(data);
}

export async function startReview(submissionId) {
  const { data } = await client.post(`/reviews/${submissionId}/start`);
  return mapSubmission(data);
}
