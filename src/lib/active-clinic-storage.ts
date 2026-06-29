const KEY_PREFIX = "fos:active-clinic:";

export function getStoredActiveClinicId(userId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(`${KEY_PREFIX}${userId}`);
  } catch {
    return null;
  }
}

export function setStoredActiveClinicId(userId: string, clinicId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${KEY_PREFIX}${userId}`, clinicId);
  } catch {
    /* ignore quota errors */
  }
}

export function clearStoredActiveClinicId(userId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(`${KEY_PREFIX}${userId}`);
  } catch {
    /* ignore */
  }
}
