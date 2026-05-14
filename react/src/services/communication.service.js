import { api } from '../api/client.js';

export async function getVisibleCommunications(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const { data } = await api.get(`/communication?${qs}`);
  return data || [];
}

export async function getCommunicationLookups(search = '') {
  const qs = new URLSearchParams(search ? { search } : {}).toString();
  const { data } = await api.get(`/communication/lookups${qs ? `?${qs}` : ''}`);
  return data; // { classes, sections, students }
}

export async function saveCommunication(values) {
  try {
    const { data } = values?.id
      ? await api.patch(`/communication/${values.id}`, values)
      : await api.post('/communication', values);

    return { success: true, data: data.record, delivery: data.delivery };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}

export async function archiveCommunication(id, reason = '') {
  try {
    const { data } = await api.post(`/communication/${id}/archive`, { reason });
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}