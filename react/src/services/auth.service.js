import { api, setAccessToken } from '../api/client.js';

export async function login(credentials = {}) {
  try {
    const { data } = await api.post('/auth/login', credentials, { auth: false });
    setAccessToken(data.accessToken);
    return { success: true, session: data };
  } catch (e) {
    return { success: false, message: e.message, errors: e.details };
  }
}

export async function logout() {
  try {
    await api.post('/auth/logout', {}, { auth: false });
  } finally {
    setAccessToken(null);
  }
}

export async function getSession() {
  // In this backend design, session is server-side (refresh cookie) + access token in memory.
  // AuthContext should call /auth/me instead. This function is here for compatibility.
  try {
    const { data } = await api.get('/auth/me');
    return data;
  } catch {
    return null;
  }
}

export async function forgotPasswordRequest(values = {}) {
  try {
    const { data } = await api.post('/auth/forgot-password', values, { auth: false });
    return { success: true, message: data.message };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function getDemoCredentials() {
  try {
    const { data } = await api.get('/auth/demo-credentials', { auth: false });
    return data || [];
  } catch {
    return [];
  }
}