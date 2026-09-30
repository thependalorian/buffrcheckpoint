import type { ReactNode } from "react";

/**
 * Brand-mustard phone bezel for real product screenshots in the home hero.
 * Pure CSS (no third-party device PNG), so it stays sharp at every size.
 */
export function PhoneProductFrame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <figure className="relative mx-auto w-full min-w-0 max-w-[18rem]" aria-label={label}>
      <div className="relative rounded-[2.75rem] bg-[var(--color-sodium-yellow)] p-2.5 shadow-[0_24px_60px_-20px_color-mix(in_srgb,var(--color-charcoal)_45%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--color-sodium-yellow)_70%,black)]">
        <span
          aria-hidden
          className="absolute top-24 -left-1 h-10 w-1 rounded-l bg-[color-mix(in_srgb,var(--color-sodium-yellow)_80%,black)]"
        />
        <span
          aria-hidden
          className="absolute top-36 -left-1 h-10 w-1 rounded-l bg-[color-mix(in_srgb,var(--color-sodium-yellow)_80%,black)]"
        />
        <span
          aria-hidden
          className="absolute top-28 -right-1 h-16 w-1 rounded-r bg-[color-mix(in_srgb,var(--color-sodium-yellow)_80%,black)]"
        />
        <div className="relative overflow-hidden rounded-[2.25rem] bg-background">
          <span
            aria-hidden
            className="absolute top-2.5 left-1/2 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-[var(--color-charcoal)]"
          />
          <div className="pt-10">{children}</div>
        </div>
      </div>
    </figure>
  );
}
