import { useCallback, useEffect, useState } from 'react';

const DEFAULT_KEY = 'giphy:lastSearch';

export function useLastSearch(storageKey: string = DEFAULT_KEY) {
  const [lastSearch, setLastSearchState] = useState<string>(() => {
    try {
      return (localStorage.getItem(storageKey) || '').trim();
    } catch {
      return '';
    }
  });

  // Keep state in sync if storage changes in other tabs/windows
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === storageKey) {
        setLastSearchState((e.newValue || '').trim());
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [storageKey]);

  const saveLastSearch = useCallback((value: string) => {
    const trimmed = (value || '').trim();
    if (!trimmed) return;
    try {
      localStorage.setItem(storageKey, trimmed);
      setLastSearchState(trimmed);
    } catch {
      // ignore
    }
  }, [storageKey]);

  const clearLastSearch = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    setLastSearchState('');
  }, [storageKey]);

  return { lastSearch, saveLastSearch, clearLastSearch };
}
