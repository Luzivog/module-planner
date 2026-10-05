// localStorage that never throws: private modes, blocked storage or a full quota
// just mean nothing is remembered.

/** All keys this app writes start with this, so "reset" can clear them. */
export const STORAGE_PREFIX = "module-planner:"

export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // not remembered; the app still works
  }
}

/** Removes every key this app saved (used by the error screen's reset). */
export function clearAppStorage(): void {
  try {
    const keys = Object.keys(window.localStorage).filter((k) => k.startsWith(STORAGE_PREFIX) || k.startsWith("col-"))
    for (const k of keys) window.localStorage.removeItem(k)
  } catch {
    // nothing to clear
  }
}
