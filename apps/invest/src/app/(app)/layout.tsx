import { BottomNav } from '@/components/nav/bottom-nav'

/**
 * Every route in this group reads financial data, so every one of them is
 * dynamic. `use cache` is banned in here -- see CLAUDE.md. A cached portfolio
 * value is a wrong portfolio value.
 */
export const dynamic = 'force-dynamic'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-16">
      <div className="mx-auto w-full max-w-md px-5">{children}</div>
      <BottomNav />
    </div>
  )
}
