import { api } from '../api/client.js';

export async function getAssignments(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const { data, meta } = await api.get(`/assignments?${qs}`);
  return { items: data || [], meta };
}

export async function getAssignmentById(id) {
  const { data } = await api.get(`/assignments/${id}`);
  return data;
}

export async function saveAssignment(values) {
  try {
    const { data } = values?.id
      ? await api.patch(`/assignments/${values.id}`, values)
      : await api.post('/assignments', values);
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}

export async function archiveAssignment(id, reason = '') {
  try {
    const { data } = await api.post(`/assignments/${id}/archive`, { reason });
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}