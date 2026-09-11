import client from './client';

export async function login(email, password) {
  const { data } = await client.post('/auth/login', { email, password });
  return data;
}

export async function register(payload) {
  const { data } = await client.post('/auth/register', payload);
  return data;
}

export async function fetchMe() {
  const { data } = await client.get('/auth/me');
  return data;
}

export async function logout(refreshToken) {
  await client.post('/auth/logout', { refresh_token: refreshToken || null });
}

export async function listUsers() {
  const { data } = await client.get('/auth/users');
  return data;
}

export async function createUser(payload) {
  const { data } = await client.post('/auth/users', payload);
  return data;
}

export async function assignUserRole(userId, payload) {
  const { data } = await client.post(`/auth/users/${userId}/roles`, payload);
  return data;
}
