import { api } from '../api/client.js';

export async function getGuardians(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const { data, meta } = await api.get(`/guardians?${qs}`);
  return { items: data || [], meta };
}