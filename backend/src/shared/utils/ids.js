export function safeString(value) {
  return value == null ? '' : String(value);
}

export function trim(value) {
  return safeString(value).trim();
}

export function lower(value) {
  return trim(value).toLowerCase();
}

export function normalizeEmail(email) {
  return lower(email);
}

export function normalizeUsername(username) {
  return lower(username);
}