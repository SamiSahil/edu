import { api } from '../api/client.js';

export async function getReports(filters = {}) {
  const cleanFilters = {};
  Object.keys(filters).forEach((key) => {
    if (filters[key]) cleanFilters[key] = filters[key];
  });

  const qs = new URLSearchParams(cleanFilters).toString();
  const { data } = await api.get(`/reports?${qs}`);
  return data;
}

export function exportReportLabel(filters = {}) {
  const parts = [filters.month, filters.category ? `Category: ${filters.category}` : null].filter(Boolean);
  return parts.join(' / ') || 'General Report';
}