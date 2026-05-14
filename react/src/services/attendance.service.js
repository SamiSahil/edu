import { api } from '../api/client.js';

export async function getAttendanceForDateSection(date, sectionId) {
  const qs = new URLSearchParams({ date, sectionId }).toString();
  const { data } = await api.get(`/attendance/for-date?${qs}`);
  return data || [];
}

export async function markAttendanceBatch(records = []) {
  try {
    const { data } = await api.post('/attendance/mark-batch', { records });
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}

export async function getAttendanceMonthReport(month) {
  const qs = new URLSearchParams({ month }).toString();
  const { data } = await api.get(`/attendance/reports?${qs}`);
  return data;
}