import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <div className="min-w-0 overflow-x-clip bg-background">
        <div className="mx-auto min-w-0 max-w-2xl px-4 py-20 text-center sm:px-6 sm:py-24 lg:px-8">
          <p className="font-mono text-sm text-muted-foreground">404</p>
          <h1 className="mt-4 font-heading text-4xl font-light tracking-tight text-foreground">Page not found</h1>
          <p className="mt-4 text-muted-foreground">This page does not exist or has moved.</p>
          <div className="mt-8">
            <Link
              href="/"
              className="inline-flex items-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
