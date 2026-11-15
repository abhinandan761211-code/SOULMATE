import { useCallback, useEffect, useState } from 'react'
import { applyTheme, getStoredTheme, saveTheme, type Theme } from './theme'

/** Theme state for the toggle button — reads the stored preference on mount. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const set = useCallback((next: Theme) => {
    setTheme(next)
    saveTheme(next)
  }, [])

  return { theme, setTheme: set }
}
