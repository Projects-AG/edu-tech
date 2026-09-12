import client from './client';
import { mapSubmission, mapSubmissionList } from '../utils/naacMappers';

export async function listSubmissions({ cycleId, status, q } = {}) {
  const params = {};
  if (cycleId) params.cycle_id = cycleId;
  if (status && status !== 'all') params.status = status;
  if (q) params.q = q;

  const { data } = await client.get('/submissions', { params });
  return mapSubmissionList(data);
}

export async function getSubmission(submissionId) {
  const { data } = await client.get(`/submissions/${submissionId}`);
  return mapSubmission(data);
}

export async function createSubmission(payload) {
  const { data } = await client.post('/submissions', payload);
  return mapSubmission(data);
}

export async function submitForReview(submissionId) {
  const { data } = await client.post(`/submissions/${submissionId}/submit`);
  return mapSubmission(data);
}

export async function approveSubmission(submissionId) {
  const { data } = await client.post(`/submissions/${submissionId}/approve`);
  return mapSubmission(data);
}

export async function requestCorrection(submissionId, note) {
  const { data } = await client.post(`/submissions/${submissionId}/request-correction`, { note });
  return mapSubmission(data);
}
