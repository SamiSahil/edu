import { api } from '../api/client.js';

export async function getProfile() {
  const { data } = await api.get('/profile');
  return data; // { user, activeSchool }
}

export async function updateProfile(values) {
  try {
    const { data } = await api.patch('/profile', values);
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}

export async function changePassword(values) {
  try {
    const { data } = await api.post('/profile/change-password', values);
    return { success: true, data };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}