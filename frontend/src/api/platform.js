import client from './client';

export async function fetchDashboardSummary() {
  const { data } = await client.get('/dashboard/summary');
  return data;
}

export async function listDepartments(institutionId) {
  const { data } = await client.get(`/departments/institution/${institutionId}`);
  return data;
}

export async function createDepartment(payload) {
  const { data } = await client.post('/departments', payload);
  return data;
}

export async function getInstitution(institutionId) {
  const { data } = await client.get(`/institutions/${institutionId}`);
  return data;
}

export async function listAcademicYears(institutionId) {
  const { data } = await client.get(`/academic-years/institution/${institutionId}`);
  return data;
}

export async function createAcademicYear(payload) {
  const { data } = await client.post('/academic-years', payload);
  return data;
}

export async function listAuditLogs(institutionId, limit = 100) {
  const { data } = await client.get(`/audit-logs/institution/${institutionId}`, {
    params: { limit },
  });
  return data;
}

export async function uploadFile(file) {
  const form = new FormData();
  form.append('upload', file);
  const { data } = await client.post('/files/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
