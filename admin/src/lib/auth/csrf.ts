// Section 5: "CSRF protection for state-changing cookie-authenticated
// requests." The backend itself is never cookie-authenticated (its
// JwtAuthGuard only reads an Authorization header — see
// backend/src/modules/auth/strategies/jwt.strategy.ts), so the actual
// CSRF-exposed surface is these three Next.js Route Handlers, which DO
// trust the browser's automatically-attached session cookie. SameSite=Lax
// already blocks a cross-site form POST from carrying the cookie, but this
// adds the standard defense-in-depth check used for cookie+fetch APIs: a
// state-changing request must have an Origin (or Referer, as a fallback)
// that matches this app's own origin. A cross-site page cannot forge that
// header — browsers set Origin/Referer themselves and JS cannot override
// them on a simple form submission or cross-origin fetch without CORS
// approval this server never grants.
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const requestOrigin = new URL(request.url).origin;

  if (origin) return origin === requestOrigin;
  if (referer) return new URL(referer).origin === requestOrigin;
  // Neither header present: same-origin browser requests always send at
  // least one of these for a fetch POST, so treat a request with neither
  // as suspicious rather than assume same-origin.
  return false;
}
