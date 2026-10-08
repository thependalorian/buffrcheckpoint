import { PRIVACY_MANAGED } from "@/lib/copy/privacy-managed";
import {
  marketingCapabilityCard,
  marketingLead,
  marketingSectionTitle,
  marketingWideSection,
} from "@/lib/marketing-layout";

/** A last card that would sit alone in its row stretches across the empty columns. */
function spanClass(index: number, count: number): string {
  if (index !== count - 1) return "";
  return `${count % 2 === 1 ? "md:col-span-2" : ""} ${count % 3 === 2 ? "lg:col-span-2" : count % 3 === 1 ? "lg:col-span-3" : "lg:col-span-1"}`;
}

/** The product's main promise, stated once in plain words: Checkpoint does the data protection work so the organisation does not have to. */
export function PrivacyManagedSection() {
  return (
    <section className="border-b border-border bg-card">
      <div className={marketingWideSection}>
        <p className="bc-marketing-eyebrow text-[var(--color-sodium-yellow-ink)]">{PRIVACY_MANAGED.eyebrow}</p>
        <h2 className={`mt-3 ${marketingSectionTitle}`}>{PRIVACY_MANAGED.title}</h2>
        <p className={`mt-4 ${marketingLead}`}>{PRIVACY_MANAGED.lead}</p>
        <div className="mt-12 grid min-w-0 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {PRIVACY_MANAGED.items.map((item, index) => (
            <div
              key={item.title}
              className={`min-w-0 ${marketingCapabilityCard} ${spanClass(index, PRIVACY_MANAGED.items.length)}`}
            >
              <h3 className="font-heading text-lg font-medium text-foreground">{item.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 font-heading text-lg font-light text-foreground">{PRIVACY_MANAGED.close}</p>
      </div>
    </section>
  );
}
