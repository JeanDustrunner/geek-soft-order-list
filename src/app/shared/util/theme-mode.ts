export type ThemeMode = 'system' | 'light' | 'dark';
export const isThemeMode = (v: unknown): v is ThemeMode =>
  v === 'system' || v === 'light' || v === 'dark';