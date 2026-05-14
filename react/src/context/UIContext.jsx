import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { loadUIState, saveUIState } from '../services/storage.js';
import { formatMonth, trimValue } from '../lib/utils.js';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [state, setState] = useState(() => loadUIState());
  const [toasts, setToasts] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const sync = () => setState(loadUIState());
    window.addEventListener('sms-ui-updated', sync);
    return () => window.removeEventListener('sms-ui-updated', sync);
  }, []);

  const setSelectedMonth = useCallback((value) => {
    const next = { ...state, selectedMonth: value };
    setState(next);
    saveUIState(next);
  }, [state]);

  const pushToast = useCallback((toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((current) => [
      ...current,
      {
        id,
        title: toast.title || 'Notice',
        message: trimValue(toast.message),
        tone: toast.tone || 'success',
      },
    ]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, toast.duration || 3200);
  }, []);

  const toastApi = useMemo(() => ({
    success: (message, title = 'Success') => pushToast({ tone: 'success', message, title }),
    error: (message, title = 'Error') => pushToast({ tone: 'danger', message, title }),
    info: (message, title = 'Info') => pushToast({ tone: 'info', message, title }),
    warning: (message, title = 'Warning') => pushToast({ tone: 'warning', message, title }),
  }), [pushToast]);

  const value = useMemo(() => ({
    selectedMonth: state.selectedMonth,
    selectedMonthLabel: formatMonth(state.selectedMonth),
    setSelectedMonth,
    sidebarOpen,
    openSidebar: () => setSidebarOpen(true),
    closeSidebar: () => setSidebarOpen(false),
    toggleSidebar: () => setSidebarOpen((current) => !current),
    toasts,
    toast: toastApi, // stable reference
  }), [sidebarOpen, state.selectedMonth, setSelectedMonth, toasts, toastApi]);

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used within UIProvider');
  return context;
}