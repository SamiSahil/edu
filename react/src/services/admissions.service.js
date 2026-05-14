import { api } from '../api/client.js';

export async function getAdmissions(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const { data, meta } = await api.get(`/admissions?${qs}`);
  return { items: data || [], meta };
}

export async function getAdmissionById(id) {
  const { data } = await api.get(`/admissions/${id}`);
  return data;
}

export async function saveAdmission(values) {
  try {
    const { data } = values?.id
      ? await api.patch(`/admissions/${values.id}`, values)
      : await api.post('/admissions', values);

    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}

export async function archiveAdmission(id) {
  try {
    const { data } = await api.post(`/admissions/${id}/archive`, {});
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function convertAdmissionToStudent(admissionId, overrides = {}) {
  try {
    const { data } = await api.post(`/admissions/${admissionId}/convert`, overrides);
    // backend returns { student }
    return { success: true, student: data.student };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}