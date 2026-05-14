import { api } from '../api/client.js';

export async function getDashboardSummary(monthKey) {
  const qs = new URLSearchParams(monthKey ? { month: monthKey } : {}).toString();
  const { data } = await api.get(`/dashboard/summary${qs ? `?${qs}` : ''}`);
  return data;
}