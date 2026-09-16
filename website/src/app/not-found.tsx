import Link from "next/link";

import { Button } from "@/components/ui/button";

// Section 1a.3/11.8.8: branded per the design tokens, not the framework
// default — a link back to Home, never a dead end.
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <span className="text-sm font-mono text-slate">404</span>
      <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Page not found</h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        The page you're looking for doesn't exist, or it moved. Every visitor record still stays isolated. This URL
        didn't.
      </p>
      <Button asChild size="lg" className="mt-8">
        <Link href="/">Back to Home</Link>
      </Button>
    </div>
  );
}
