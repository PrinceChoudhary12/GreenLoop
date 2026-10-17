import { useContext } from 'react';
import {
  ThemeContext,
  DEFAULT_PREFERENCES,
  type ThemeId,
  type WallpaperId,
  type DensityMode,
  type AnimationMode,
  type BorderRadiusMode,
  type SidebarMode,
  type UserPreferences,
} from './ThemeContext';

export type {
  ThemeId,
  WallpaperId,
  DensityMode,
  AnimationMode,
  BorderRadiusMode,
  SidebarMode,
  UserPreferences,
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Safe fallback for tests / standalone components
    return {
      preferences: DEFAULT_PREFERENCES,
      resolvedTheme: 'light',
      setPreferences: () => {},
      setTheme: () => {},
      setWallpaper: () => {},
      setDensity: () => {},
      setAnimation: () => {},
      setBorderRadius: () => {},
      setSidebarMode: () => {},
      resetToDefaults: () => {},
    };
  }
  return context;
};
