import { api } from '../api/client.js';

export async function getRoutes() {
  const { data } = await api.get('/transport/routes');
  return data || [];
}

export async function getVehicles() {
  const { data } = await api.get('/transport/vehicles');
  return data || [];
}

export async function getAssignments() {
  const { data } = await api.get('/transport/assignments');
  return data || [];
}

export async function saveTransportAssignment(values) {
  try {
    const { data } = values?.id
      ? await api.patch(`/transport/assignments/${values.id}`, values)
      : await api.post('/transport/assignments', values);
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}

export async function setTransportAssignmentActive(id, active) {
  try {
    const { data } = await api.post(`/transport/assignments/${id}/toggle`, { active });
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function archiveTransportAssignment(id) {
  try {
    const { data } = await api.del(`/transport/assignments/${id}`);
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}