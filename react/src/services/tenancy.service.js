import { api } from '../api/client.js';

export async function listMySchools() {
  const { data } = await api.get('/tenancy/schools');
  return data || [];
}

export async function selectSchool(schoolId) {
  const { data } = await api.post('/tenancy/select-school', { schoolId });
  return data; // { accessToken, activeSchool }
}