import { api } from '../api/client.js';

export async function getBooks(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const { data } = await api.get(`/library/books?${qs}`);
  return data || [];
}

export async function saveBook(values) {
  try {
    const { data } = await api.post('/library/books', values);
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}

export async function getIssues() {
  const { data } = await api.get('/library/issue-return');
  return data || [];
}

export async function issueBook(values) {
  try {
    const { data } = await api.post('/library/issue-return', values);
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}

export async function returnBook(issueId, returnedAt = null) {
  try {
    const { data } = await api.post(`/library/issue-return/${issueId}/return`, returnedAt ? { returnedAt } : {});
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}