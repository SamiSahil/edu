import { api } from '../api/client.js';

export async function getExams(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const { data, meta } = await api.get(`/exams?${qs}`);
  return { items: data || [], meta };
}

export async function getExamById(id) {
  const { data } = await api.get(`/exams/${id}`);
  return data;
}

export async function saveExam(values) {
  try {
    const { data } = values?.id
      ? await api.patch(`/exams/${values.id}`, values)
      : await api.post('/exams', values);
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}

export async function publishExam(id) {
  try {
    const { data } = await api.post(`/exams/${id}/publish`, {});
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function lockExam(id) {
  try {
    const { data } = await api.post(`/exams/${id}/lock`, {});
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function saveMarks(entry) {
  // single mark upsert
  try {
    const { data } = await api.post('/exams/marks', entry);
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}

export async function saveMarksBatch(entries = []) {
  try {
    const { data } = await api.post('/exams/marks/batch', { entries });
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}

export async function calculateReportCard(examId) {
  const { data } = await api.get(`/exams/${examId}/report-cards`);
  return data || [];
}