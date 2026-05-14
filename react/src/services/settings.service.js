import { api } from '../api/client.js';

export async function getSchoolSettings() {
  const { data } = await api.get('/settings/school');
  return data;
}

export async function updateSchoolSettings(values) {
  try {
    const { data } = await api.patch('/settings/school', values);
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}

export async function getRolesMatrix() {
  const { data } = await api.get('/settings/roles');
  return data; // {modules, roles}
}