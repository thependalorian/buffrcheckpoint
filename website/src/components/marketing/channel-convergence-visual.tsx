import { ChevronDown, MessageSquare, Nfc, QrCode, ShieldCheck, Tablet, UserCheck } from "lucide-react";

const CHANNELS = [
  { icon: Nfc, label: "NFC badge" },
  { icon: QrCode, label: "QR invitation" },
  { icon: Tablet, label: "Tablet kiosk" },
  { icon: MessageSquare, label: "SMS" },
  { icon: UserCheck, label: "Assisted entry" },
] as const;

/** Multi-channel strip converging on one record — channels first, hub below (PRD §11.6.5.3). */
export function ChannelConvergenceVisual() {
  return (
    <div className="bc-surface-muted mx-auto min-w-0 max-w-5xl p-6 sm:p-10">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {CHANNELS.map((channel) => (
          <li
            key={channel.label}
            className="bc-surface flex min-w-0 flex-col items-center gap-2.5 p-3 text-center sm:p-4"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-sodium-yellow)_14%,var(--color-pure-white))] text-[var(--color-sodium-yellow-ink)]">
              <channel.icon aria-hidden className="size-5 sm:size-6" />
            </span>
            <span className="text-xs font-medium leading-snug text-foreground sm:text-sm">{channel.label}</span>
          </li>
        ))}
      </ul>

      <div className="mx-auto mt-8 flex max-w-xs flex-col items-center text-muted-foreground" aria-hidden>
        <div className="h-10 w-px bg-border" />
        <span className="flex size-9 items-center justify-center rounded-full border border-border bg-card">
          <ChevronDown className="size-4" />
        </span>
        <div className="h-8 w-px bg-border" />
      </div>

      <div className="bc-surface mx-auto mt-2 max-w-lg border-[color-mix(in_srgb,var(--color-sodium-yellow)_45%,var(--color-frost))] px-6 py-6 text-center sm:px-8 sm:py-7">
        <ShieldCheck aria-hidden className="mx-auto size-9 text-[var(--color-sodium-yellow-ink)]" />
        <p className="mt-3 font-heading text-lg font-medium tracking-tight text-foreground sm:text-xl">
          One isolated visitor record
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Same encryption, audit trail, and retention policy for every channel.
        </p>
      </div>
    </div>
  );
}
