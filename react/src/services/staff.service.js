import { api } from '../api/client.js';

export async function getStaff(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const { data, meta } = await api.get(`/staff?${qs}`);
  return { items: data || [], meta };
}

export async function getStaffById(id) {
  const { data } = await api.get(`/staff/${id}`);
  return data;
}

export async function saveStaff(values) {
  try {
    const { data } = values?.id
      ? await api.patch(`/staff/${values.id}`, values)
      : await api.post('/staff', values);
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}

export async function archiveStaff(id) {
  try {
    const { data } = await api.post(`/staff/${id}/archive`, {});
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}