import { createContext, useContext, useMemo } from 'react';

const SchoolContext = createContext(null);

export function SchoolProvider({ children }) {
  // We provide an empty object for 'db' so old code doesn't break
  const value = useMemo(() => ({ 
    db: {}, 
    ready: true, 
    reload: () => {} 
  }), []);

  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>;
}

export function useSchool() {
  const context = useContext(SchoolContext);
  if (!context) return { db: {} }; // Return empty object instead of crashing
  return context;
}