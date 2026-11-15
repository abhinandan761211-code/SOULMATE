/**
 * Theme preference: 'light' | 'dark' | 'system'.
 * Stored in localStorage and applied as `.dark` on <html> (Tailwind v4 dark variant).
 */

export type Theme = 'light' | 'dark' | 'system'

const KEY = 'soulmate:theme'

export function getStoredTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'system'
  const v = localStorage.getItem(KEY)
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
}

export function systemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return theme
}

export function applyTheme(theme: Theme) {
  const resolved = resolveTheme(theme)
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved
  // keep the mobile browser chrome in sync
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', resolved === 'dark' ? '#0b1120' : '#ffffff')
}

export function saveTheme(theme: Theme) {
  localStorage.setItem(KEY, theme)
  applyTheme(theme)
}

/** Call once before React renders to avoid a white flash for dark-mode users. */
export function initTheme() {
  applyTheme(getStoredTheme())
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStoredTheme() === 'system') applyTheme('system')
  })
}
