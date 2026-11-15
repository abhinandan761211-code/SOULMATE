import { useEffect, useState } from 'react'

/** Which quick-capture sheet is open (`null` = closed). */
export type CaptureMode = 'journal' | 'goal' | null

type Listener = (mode: CaptureMode) => void

const listeners = new Set<Listener>()
let current: CaptureMode = null

function emit(next: CaptureMode) {
  current = next
  listeners.forEach((l) => l(next))
}

/** Open the quick-capture sheet from anywhere (button, shortcut, palette). */
export function openQuickCapture(mode: Exclude<CaptureMode, null>) {
  emit(mode)
}

export function closeQuickCapture() {
  emit(null)
}

export function useQuickCapture() {
  const [mode, setMode] = useState<CaptureMode>(current)
  useEffect(() => {
    listeners.add(setMode)
    return () => {
      listeners.delete(setMode)
    }
  }, [])
  return { mode, open: openQuickCapture, close: closeQuickCapture }
}

/* ------------------------------- key helpers -------------------------------- */

let lastMetaDown = 0

/**
 * True for ⌘/Ctrl+K when some clients deliver the modifier as its own keydown
 * and follow with a bare "k". Also treats a ⌘ press within the last 700ms as
 * a modifier on the next key, which covers `keypress`-style delivery.
 *
 * Call from a keydown listener; `k` should be the lower-cased event key.
 */
export function isCmdKey(e: KeyboardEvent, combo: { key: string; shift?: boolean }): boolean {
  const want = combo.key.toLowerCase()
  const hasModifier = e.metaKey || e.ctrlKey

  if (hasModifier) {
    lastMetaDown = 0
    if (e.key.toLowerCase() !== want) return false
    // ⇧ is only honoured when asked for — ⌘K must not fire on ⌘⇧K
    return combo.shift ? e.shiftKey : !e.shiftKey
  }

  if (e.key === 'Meta' || e.key === 'Control') {
    lastMetaDown = Date.now()
    return false
  }

  if (e.key.toLowerCase() !== want) return false
  const recent = lastMetaDown > 0 && Date.now() - lastMetaDown < 700
  return recent && (combo.shift ? e.shiftKey : !e.shiftKey)
}

/* ------------------------------ command palette ----------------------------- */

const paletteListeners = new Set<(open: boolean) => void>()
let paletteOpen = false

export function toggleCommandPalette(open?: boolean) {
  paletteOpen = open ?? !paletteOpen
  paletteListeners.forEach((l) => l(paletteOpen))
}

export function useCommandPalette() {
  const [open, setOpen] = useState(paletteOpen)
  useEffect(() => {
    paletteListeners.add(setOpen)
    return () => {
      paletteListeners.delete(setOpen)
    }
  }, [])
  return { open, setOpen: toggleCommandPalette }
}
