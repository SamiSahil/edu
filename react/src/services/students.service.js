import { api } from '../api/client.js';

export async function getStudents(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const { data, meta } = await api.get(`/students?${qs}`);
  return { items: data || [], meta };
}

export async function getStudentById(id) {
  const { data } = await api.get(`/students/${id}`);
  return data;
}

export async function saveStudent(values) {
  try {
    const { data } = values?.id
      ? await api.patch(`/students/${values.id}`, values)
      : await api.post('/students', values);

    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}

export async function archiveStudent(id) {
  try {
    const { data } = await api.post(`/students/${id}/archive`, {});
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function promoteStudent(id, payload = {}) {
  try {
    const { data } = await api.post(`/students/${id}/promote`, payload);
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function transferStudent(id, reason = '') {
  try {
    const { data } = await api.post(`/students/${id}/transfer`, { reason });
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}