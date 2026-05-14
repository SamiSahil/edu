import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  api,
  getAccessToken,
  setAccessToken,
  setPreferredSchoolId,
} from '../api/client.js';
import { listMySchools, selectSchool as tenancySelectSchool } from '../services/tenancy.service.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const bootedRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [userCore, setUserCore] = useState(null);
  const [activeSchool, setActiveSchool] = useState(null);
  const [linkedStudentIds, setLinkedStudentIds] = useState([]);
  const [memberships, setMemberships] = useState([]);

  const loadMemberships = async () => {
    try {
      const items = await listMySchools();
      setMemberships(items || []);
    } catch {
      setMemberships([]);
    }
  };

  const boot = async () => {
    try {
      // Step 1: Try to refresh to obtain an access token (best effort).
      // If user is not logged in, this will 401 and we ignore it.
      try {
        const refreshed = await api.post(
          '/auth/refresh',
          {},
          { auth: false, retryOnAuthError: false }
        );

        const token = refreshed?.data?.accessToken || null;
        const activeSchoolId = refreshed?.data?.activeSchoolId || null;

        if (token) setAccessToken(token);
        if (activeSchoolId) setPreferredSchoolId(activeSchoolId);
      } catch {
        // not logged in (or cookie missing) -> ignore
      }

      // Step 2: If we have a token now, fetch /auth/me
      if (getAccessToken()) {
        const me = await api.get('/auth/me', { retryOnAuthError: false });

        setUserCore(me.data?.user || null);
        setActiveSchool(me.data?.activeSchool || null);
        setLinkedStudentIds(me.data?.linkedStudentIds || []);

        if (me.data?.activeSchool?.id) {
          setPreferredSchoolId(me.data.activeSchool.id);
        }

        await loadMemberships();
      } else {
        // Not authenticated
        setUserCore(null);
        setActiveSchool(null);
        setLinkedStudentIds([]);
        setMemberships([]);
      }
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    // Prevent duplicate boot calls in React StrictMode (dev)
    if (bootedRef.current) return;
    bootedRef.current = true;
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({
      ready,
      user: userCore
        ? { ...userCore, role: activeSchool?.role, activeSchool, linkedStudentIds }
        : null,
      role: activeSchool?.role || null,
      isAuthenticated: Boolean(userCore),
      memberships,

      login: async (credentials) => {
        const { data } = await api.post('/auth/login', credentials, {
          auth: false,
          retryOnAuthError: false,
        });

        setAccessToken(data?.accessToken);
        setUserCore(data?.user || null);
        setActiveSchool(data?.activeSchool || null);
        setMemberships(data?.memberships || []);

        if (data?.activeSchool?.id) setPreferredSchoolId(data.activeSchool.id);

        const me = await api.get('/auth/me', { retryOnAuthError: false });
        setLinkedStudentIds(me.data?.linkedStudentIds || []);

        await loadMemberships();
        return { success: true };
      },

      logout: async () => {
        try {
          await api.post('/auth/logout', {}, { auth: false, retryOnAuthError: false });
        } finally {
          setAccessToken(null);
          setPreferredSchoolId('');
          setUserCore(null);
          setActiveSchool(null);
          setLinkedStudentIds([]);
          setMemberships([]);
        }
      },

      selectSchool: async (schoolId) => {
        const result = await tenancySelectSchool(schoolId);

        setAccessToken(result?.accessToken);
        setActiveSchool(result?.activeSchool || null);

        if (result?.activeSchool?.id) setPreferredSchoolId(result.activeSchool.id);

        const me = await api.get('/auth/me', { retryOnAuthError: false });
        setUserCore(me.data?.user || null);
        setActiveSchool(me.data?.activeSchool || null);
        setLinkedStudentIds(me.data?.linkedStudentIds || []);

        await loadMemberships();
        return { success: true };
      },
    }),
    [ready, userCore, activeSchool, linkedStudentIds, memberships]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}