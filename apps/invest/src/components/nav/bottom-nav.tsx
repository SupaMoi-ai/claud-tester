'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cx } from '@/components/ui/primitives'

/**
 * Four tabs, and no more.
 *
 * Discover is a view over Research, and What-if is a view over the portfolio,
 * so neither earns a tab of its own. The AI lives as a pill on every screen
 * rather than a destination -- an assistant you have to navigate to is an
 * assistant you stop using.
 */
const TABS = [
  { href: '/', label: 'Portefølje', icon: WalletIcon },
  { href: '/innsikt', label: 'Innsikt', icon: RadarIcon },
  { href: '/analyse', label: 'Analyse', icon: SearchIcon },
  { href: '/journal', label: 'Journal', icon: BookIcon },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Hovedmeny"
      className="fixed inset-x-0 bottom-0 z-40 border-line border-t bg-surface/95 backdrop-blur-sm"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-md">
        {TABS.map((tab) => {
          const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
          const Icon = tab.icon
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'flex h-14 flex-col items-center justify-center gap-1 text-[0.6875rem]',
                  active ? 'text-accent' : 'text-ink-faint',
                )}
              >
                <Icon filled={active} />
                <span className={active ? 'font-medium' : undefined}>{tab.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

type IconProps = { filled?: boolean }

function base(filled?: boolean) {
  return {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: filled ? 2.2 : 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
}

function WalletIcon({ filled }: IconProps) {
  return (
    <svg {...base(filled)} aria-hidden="true">
      <path d="M3 8a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" />
      <path d="M16 12h3" />
    </svg>
  )
}

function RadarIcon({ filled }: IconProps) {
  return (
    <svg {...base(filled)} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 12 18 7" />
    </svg>
  )
}

function SearchIcon({ filled }: IconProps) {
  return (
    <svg {...base(filled)} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </svg>
  )
}

function BookIcon({ filled }: IconProps) {
  return (
    <svg {...base(filled)} aria-hidden="true">
      <path d="M5 5a2 2 0 0 1 2-2h11v18H7a2 2 0 0 1-2-2V5Z" />
      <path d="M9 8h5" />
    </svg>
  )
}
