import { X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Drawer } from 'vaul';
import { copy } from '../copy';
import { cn } from '../lib/cn';

/** Sheets render inside the phone frame, not over the whole browser window. */
function usePhoneFrame(): HTMLElement | null {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setEl(document.getElementById('phone-frame'));
  }, []);
  return el;
}

export function Sheet({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  footer,
  full = false,
  dismissible = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Full-screen sheets are used for the morning check-in and onboarding. */
  full?: boolean;
  dismissible?: boolean;
}) {
  const container = usePhoneFrame();
  if (!container) return null;

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} dismissible={dismissible}>
      <Drawer.Portal container={container}>
        <Drawer.Overlay className="absolute inset-0 z-40 bg-ink/25" />
        <Drawer.Content
          // Without a subtitle there is no description to point at, and
          // repeating the title as one tells a screen reader nothing. The key
          // is only present in that case, so it overrides the default wiring.
          {...(subtitle ? {} : { 'aria-describedby': undefined })}
          className={cn(
            'absolute inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[28px] bg-surface shadow-lift outline-none',
            full ? 'top-0 rounded-t-none' : 'max-h-[88%]',
          )}
        >
          {!full ? (
            <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-line" />
          ) : null}

          {/* safe-top sets padding-top, so the spacing below it lives on an
              inner element rather than fighting the same property. */}
          <div className={cn('shrink-0', full && 'safe-top')}>
          <div
            className={cn(
              'flex items-start justify-between gap-3 px-5',
              full ? 'pt-8' : 'pt-4',
            )}
          >
            <div className="min-w-0">
              <Drawer.Title className="font-display text-[22px] leading-snug text-ink">
                {title}
              </Drawer.Title>
              {subtitle ? (
                <Drawer.Description className="mt-1 text-[14px] text-muted">
                  {subtitle}
                </Drawer.Description>
              ) : null}
            </div>
            {dismissible ? (
              <button
                type="button"
                aria-label={copy.common.close}
                onClick={() => onOpenChange(false)}
                className="tap -mr-2 -mt-2 flex items-center justify-center rounded-chip text-muted transition-colors duration-200 hover:text-ink"
              >
                <X size={20} aria-hidden />
              </button>
            ) : null}
          </div>
          </div>

          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-4">
            {children}
          </div>

          {footer ? (
            <div className="safe-bottom shrink-0 border-t border-line bg-surface">
              <div className="px-5 py-3">{footer}</div>
            </div>
          ) : (
            <div className="safe-bottom shrink-0" />
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
