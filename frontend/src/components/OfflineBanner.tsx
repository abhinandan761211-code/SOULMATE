import { useEffect, useState } from 'react'
import { CloudOff, Wifi } from 'lucide-react'
import { useOnline } from '../lib/pwa'

/**
 * Thin status strip. `offline` = no network; `back` = the "you're back" flash
 * that fades after a few seconds. Content you already loaded stays visible
 * (service worker serves the app shell) and quick-capture drafts are local.
 */
export function OfflineBanner() {
  const online = useOnline()
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    if (!online) setWasOffline(true)
    else if (wasOffline) {
      const t = setTimeout(() => setWasOffline(false), 2600)
      return () => clearTimeout(t)
    }
  }, [online, wasOffline])

  if (online && !wasOffline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`sticky top-0 z-[60] flex items-center justify-center gap-2 px-4 py-1.5 text-[12px] font-medium ${online ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-amber-950'
        }`}
    >
      {online ? (
        <>
          <Wifi size={13} /> Back online — everything is syncing again
        </>
      ) : (
        <>
          <CloudOff size={13} /> You’re offline. You can keep writing — quick capture saves a local draft.
        </>
      )}
    </div>
  )
}
