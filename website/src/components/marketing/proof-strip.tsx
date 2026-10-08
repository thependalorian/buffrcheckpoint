/** Four plain facts under the hero, set in mono figures. Every fact is stated elsewhere on the page. */
export function ProofStrip({ items }: { items: readonly { figure: string; label: string }[] }) {
  return (
    <section aria-label="Key facts" className="border-b border-border bg-card">
      <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-border lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="bg-card px-4 py-6 sm:px-6 lg:px-8">
            <dt className="font-mono text-xl font-semibold tabular-nums text-foreground sm:text-2xl">{item.figure}</dt>
            <dd className="mt-1 text-sm text-muted-foreground">{item.label}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
