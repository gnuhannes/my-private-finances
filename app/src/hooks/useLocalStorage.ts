import { useState } from "react";

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (val: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  function set(val: T) {
    setValue(val);
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {
      // ignore write failures (e.g. private browsing quota)
    }
  }

  return [value, set];
}
