import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '../lib/useTheme'
import type { Theme } from '../lib/theme'

const OPTIONS: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
]

/**
 * Theme preference.
 *  - full (default): three-way segmented control — light · dark · system
 *  - iconOnly: one button that cycles the three, for the 76px tablet rail
 */
export function ThemeToggle({ compact, iconOnly }: { compact?: boolean; iconOnly?: boolean }) {
  const { theme, setTheme } = useTheme()

  if (iconOnly) {
    const current = OPTIONS.find((o) => o.value === theme) ?? OPTIONS[2]
    const next = OPTIONS[(OPTIONS.indexOf(current) + 1) % OPTIONS.length]
    const Icon = current.icon
    return (
      <button
        onClick={() => setTheme(next.value)}
        className="btn-icon shrink-0"
        title={`${current.label} theme — click for ${next.label.toLowerCase()}`}
        aria-label={`Theme: ${current.label}. Switch to ${next.label}.`}
      >
        <Icon size={16} />
      </button>
    )
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex w-full items-center justify-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800/60"
    >
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          onClick={() => setTheme(value)}
          title={`${label} theme`}
          className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition ${
            theme === value
              ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-slate-100'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Icon size={14} className="shrink-0" />
          {compact && <span className="sr-only">{label}</span>}
        </button>
      ))}
    </div>
  )
}
