import { BRAND } from "@/lib/copy/brand";

const FIELDS = ["Full name", "Mobile number", "Visiting", "Organisation"] as const;

/** The visitor check-in screen drawn from the design tokens, so it can never drift off-palette. */
export function CheckInPhoneMock() {
  return (
    <div className="bg-card px-4 pb-6 text-left">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <span aria-hidden className="size-6 rounded-md bg-[var(--color-sodium-yellow)]" />
        <span className="font-heading text-sm font-semibold text-foreground">{BRAND.productName}</span>
        <span className="ml-auto text-[10px] text-muted-foreground">Visitor check-in</span>
      </div>
      <p className="mt-4 font-heading text-xl leading-tight text-foreground">Welcome. Let us know who you are.</p>
      <div className="mt-4 space-y-3">
        {FIELDS.map((label) => (
          <div key={label}>
            <p className="text-[11px] font-medium text-foreground">{label}</p>
            <div className="mt-1 h-9 rounded-md border border-[var(--input-border)] bg-card" />
          </div>
        ))}
      </div>
      <div className="mt-5 flex h-10 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground">
        Check in
      </div>
      <p className="mt-3 text-center text-[10px] leading-snug text-muted-foreground">
        Your details are encrypted and kept only as long as your host needs them.
      </p>
    </div>
  );
}
