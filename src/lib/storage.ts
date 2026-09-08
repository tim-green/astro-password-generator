/** SSR-safe localStorage helpers. All calls are no-ops on the server. */
/** Read from localStorage, but return a fallback value if storage is unavailable or the key doesn't exist. This is a no-op on the server. */
export function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    /* Merge objects if both the stored value and fallback are objects, otherwise return the stored value. */
    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      fallback &&
      typeof fallback === "object" &&
      !Array.isArray(fallback)
    ) {
      return { ...fallback, ...parsed };
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

/* Write to localStorage, but fail silently if storage is unavailable or full. This is a no-op on the server. */
export function writeStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage full or unavailable (private browsing, etc.) - fail silently. */
  }
}
