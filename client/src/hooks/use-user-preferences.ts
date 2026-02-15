import { useState, useCallback } from "react";

const PREFS_KEY = "relay-user-preferences";

interface UserPreferences {
  userName: string;
  noahPicUrl: string | null;
}

const DEFAULT_PREFS: UserPreferences = {
  userName: "",
  noahPicUrl: null,
};

function loadPrefs(): UserPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_PREFS;
}

function savePrefs(prefs: UserPreferences) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}

export function useUserPreferences() {
  const [prefs, setPrefs] = useState<UserPreferences>(loadPrefs);

  const updatePrefs = useCallback((updates: Partial<UserPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...updates };
      savePrefs(next);
      return next;
    });
  }, []);

  return { prefs, updatePrefs };
}
