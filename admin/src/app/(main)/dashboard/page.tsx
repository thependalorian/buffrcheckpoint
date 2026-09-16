import { redirect } from "next/navigation";

// proxy.ts already redirects an authenticated request for the bare
// /dashboard path to /dashboard/default before this ever renders — this is
// the defensive fallback for any path that reaches the page component
// directly (e.g. a Server Component navigation the middleware doesn't see).
// Previously an empty `return;`, which rendered nothing rather than
// actually landing the user anywhere.
export default function Page() {
  redirect("/dashboard/default");
}
