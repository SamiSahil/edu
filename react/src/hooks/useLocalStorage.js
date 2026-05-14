import { useEffect, useState } from 'react';
import { loadKey, saveKey } from '../services/storage.js';

export function useLocalStorage(key, initialValue, eventName = null) {
  const [value, setValue] = useState(() => loadKey(key, initialValue));

  useEffect(() => {
    saveKey(key, value, eventName);
  }, [key, value, eventName]);

  return [value, setValue];
}