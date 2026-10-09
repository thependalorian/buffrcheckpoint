"use client";

export function setLocalStorageValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked (private mode, quota). The preference then lasts for this page view only.
  }
}

export function getLocalStorageValue(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
