import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';

export type ThemeId =
  | 'system'
  | 'light'
  | 'dark'
  | 'forest'
  | 'ocean'
  | 'midnight'
  | 'warm-earth'
  | 'high-contrast';

export type WallpaperId =
  | 'none'
  | 'subtle-gradient'
  | 'eco-pattern'
  | 'leaf-grid'
  | 'mesh-glow'
  | 'minimal-dots';

export type DensityMode = 'comfortable' | 'compact';
export type AnimationMode = 'full' | 'reduced';
export type BorderRadiusMode = 'sharp' | 'medium' | 'rounded';
export type SidebarMode = 'expanded' | 'collapsed';

export interface UserPreferences {
  theme: ThemeId;
  wallpaper: WallpaperId;
  density: DensityMode;
  animation: AnimationMode;
  borderRadius: BorderRadiusMode;
  sidebarMode: SidebarMode;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  wallpaper: 'none',
  density: 'comfortable',
  animation: 'full',
  borderRadius: 'medium',
  sidebarMode: 'expanded',
};

const STORAGE_KEY = 'greenloop_preferences';

interface ThemeContextValue {
  preferences: UserPreferences;
  resolvedTheme: string;
  setPreferences: React.Dispatch<React.SetStateAction<UserPreferences>>;
  setTheme: (theme: ThemeId) => void;
  setWallpaper: (wallpaper: WallpaperId) => void;
  setDensity: (density: DensityMode) => void;
  setAnimation: (animation: AnimationMode) => void;
  setBorderRadius: (radius: BorderRadiusMode) => void;
  setSidebarMode: (mode: SidebarMode) => void;
  resetToDefaults: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function loadStoredPreferences(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Check legacy single key migrations
      const legacyTheme = localStorage.getItem('greenloop_theme');
      if (legacyTheme && (legacyTheme === 'light' || legacyTheme === 'dark')) {
        return { ...DEFAULT_PREFERENCES, theme: legacyTheme as ThemeId };
      }
      return DEFAULT_PREFERENCES;
    }
    const parsed = JSON.parse(raw);
    return {
      theme: parsed.theme || DEFAULT_PREFERENCES.theme,
      wallpaper: parsed.wallpaper || DEFAULT_PREFERENCES.wallpaper,
      density: parsed.density || DEFAULT_PREFERENCES.density,
      animation: parsed.animation || DEFAULT_PREFERENCES.animation,
      borderRadius: parsed.borderRadius || DEFAULT_PREFERENCES.borderRadius,
      sidebarMode: parsed.sidebarMode || DEFAULT_PREFERENCES.sidebarMode,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(loadStoredPreferences);
  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Listen to OS color scheme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Listen to cross-tab storage changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setPreferences(loadStoredPreferences());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Compute resolved theme
  const resolvedTheme = useMemo(() => {
    if (preferences.theme === 'system') {
      return systemIsDark ? 'dark' : 'light';
    }
    return preferences.theme;
  }, [preferences.theme, systemIsDark]);

  // Apply DOM attributes to <html>
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    root.setAttribute('data-theme', resolvedTheme);
    root.setAttribute('data-wallpaper', preferences.wallpaper);
    root.setAttribute('data-density', preferences.density);
    root.setAttribute('data-animation', preferences.animation);
    root.setAttribute('data-radius', preferences.borderRadius);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      // Backward compatibility for legacy tests / keys
      localStorage.setItem('greenloop_theme', resolvedTheme);
      localStorage.setItem('greenloop_density', preferences.density);
    } catch {
      // ignore storage errors
    }
  }, [preferences, resolvedTheme]);

  const setTheme = useCallback((theme: ThemeId) => {
    setPreferences(prev => ({ ...prev, theme }));
  }, []);

  const setWallpaper = useCallback((wallpaper: WallpaperId) => {
    setPreferences(prev => ({ ...prev, wallpaper }));
  }, []);

  const setDensity = useCallback((density: DensityMode) => {
    setPreferences(prev => ({ ...prev, density }));
  }, []);

  const setAnimation = useCallback((animation: AnimationMode) => {
    setPreferences(prev => ({ ...prev, animation }));
  }, []);

  const setBorderRadius = useCallback((borderRadius: BorderRadiusMode) => {
    setPreferences(prev => ({ ...prev, borderRadius }));
  }, []);

  const setSidebarMode = useCallback((sidebarMode: SidebarMode) => {
    setPreferences(prev => ({ ...prev, sidebarMode }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  const value = useMemo(
    () => ({
      preferences,
      resolvedTheme,
      setPreferences,
      setTheme,
      setWallpaper,
      setDensity,
      setAnimation,
      setBorderRadius,
      setSidebarMode,
      resetToDefaults,
    }),
    [
      preferences,
      resolvedTheme,
      setTheme,
      setWallpaper,
      setDensity,
      setAnimation,
      setBorderRadius,
      setSidebarMode,
      resetToDefaults,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
