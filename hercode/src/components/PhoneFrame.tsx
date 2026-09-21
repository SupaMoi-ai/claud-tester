import type { ReactNode } from 'react';

/**
 * 430px frame centered on desktop, full-bleed with safe-area insets on a phone.
 * Everything in the app renders inside this, including sheets.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full justify-center bg-[#F2EDE5] sm:py-8">
      <div
        id="phone-frame"
        className="relative flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-bg shadow-lift sm:h-[900px] sm:rounded-[40px]"
      >
        {children}
      </div>
    </div>
  );
}
