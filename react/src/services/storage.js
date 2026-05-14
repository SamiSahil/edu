// .\react\src\services\storage.js

export function loadKey(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (e) {
    return fallback;
  }
}

export function saveKey(key, value, eventName = null) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    if (eventName) {
      window.dispatchEvent(new CustomEvent(eventName));
    }
  } catch (e) {
    console.error('Storage error', e);
  }
}

// UI State (Selected month, etc)
export function loadUIState() {
  return loadKey('sms_ui', {
    selectedMonth: new Date().toISOString().slice(0, 7),
  });
}

export function saveUIState(state) {
  saveKey('sms_ui', state, 'sms-ui-updated');
}

/** 
 * LEGACY / MOCK COMPATIBILITY
 * We provide these as empty objects so the old pages 
 * don't crash while you transition to the real API services.
 */
export function loadDatabase() {
  return {}; 
}

export function saveDatabase() {
  // No-op: we save to PostgreSQL now!
}