import { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SECURITY_COPY } from "@/lib/copy/security";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("security");

export default function SecurityPage() {
  return (
    <>
      <section className="border-b border-border/40 py-16 sm:py-20">
        <div className="mx-auto min-w-0 max-w-3xl px-4 sm:px-6 lg:px-8">
          <Badge variant="outline" className="mb-6">
            {SECURITY_COPY.badge}
          </Badge>
          <h1 className="font-heading text-3xl font-light tracking-tight sm:text-4xl lg:text-5xl">
            {SECURITY_COPY.title}
          </h1>
          <p className="mt-4 text-muted-foreground">{SECURITY_COPY.lead}</p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto min-w-0 max-w-3xl space-y-12 break-words px-4 sm:px-6 lg:px-8">
          {SECURITY_COPY.sections.map((section, index) => (
            <div key={section.heading}>
              {index > 0 ? <Separator className="mb-12" /> : null}
              <h2 className="text-2xl font-bold">{section.heading}</h2>
              {section.body.map((line) => (
                <p key={line} className="mt-4 text-muted-foreground">
                  {line}
                </p>
              ))}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
