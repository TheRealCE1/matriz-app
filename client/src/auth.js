const STORAGE_KEY = 'supervisorSession';

export function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.token || !session?.expiresAt || session.expiresAt < Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function setSession(token, expiresAt) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, expiresAt }));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}
