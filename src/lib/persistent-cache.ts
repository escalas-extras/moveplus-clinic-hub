// Lightweight localStorage cache with TTL.
// Used to persist signed URLs (logo, avatar) and last-known branding
// across full page reloads, eliminating the flash/placeholder when
// navigating or refreshing.

type Entry<T> = { v: T; e: number }; // value, expiresAt (ms)

function isBrowser() {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function pcGet<T>(key: string): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Entry<T>;
    if (!parsed || typeof parsed.e !== "number") return null;
    if (parsed.e < Date.now()) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed.v;
  } catch {
    return null;
  }
}

export function pcSet<T>(key: string, value: T, ttlMs: number): void {
  if (!isBrowser()) return;
  try {
    const entry: Entry<T> = { v: value, e: Date.now() + ttlMs };
    window.localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // ignore quota / serialization errors
  }
}

export function pcDelete(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
