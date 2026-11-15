import { useEffect, useState } from 'react'

/* ------------------------------- service worker ------------------------------ */

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  if (import.meta.env.DEV) return // never cache the dev server

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[pwa] service worker registration failed', err)
    })
  })
}

/* --------------------------------- install ---------------------------------- */

// Chrome/Edge fire `beforeinstallprompt`; we keep it so our own button can call it.
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

let deferredPrompt: InstallPromptEvent | null = null
const listeners = new Set<(available: boolean) => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as InstallPromptEvent
    listeners.forEach((l) => l(true))
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    listeners.forEach((l) => l(false))
  })
}

export function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/**
 * `available`  – a native install prompt is armed (Chrome / Edge / Android).
 * `iosHint`    – iOS Safari has no prompt; the user must use Share → Add to Home Screen.
 */
export function useInstallPrompt() {
  const [available, setAvailable] = useState(!!deferredPrompt)
  const [installed, setInstalled] = useState(isStandalone())

  useEffect(() => {
    const onChange = (v: boolean) => {
      setAvailable(v)
      setInstalled(isStandalone())
    }
    listeners.add(onChange)
    return () => {
      listeners.delete(onChange)
    }
  }, [])

  const promptInstall = async () => {
    if (!deferredPrompt) return false
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    deferredPrompt = null
    listeners.forEach((l) => l(false))
    return outcome === 'accepted'
  }

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  return { available, installed, promptInstall, iosHint: isIOS && !installed }
}

/* ------------------------------ offline status ------------------------------ */

export function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}
