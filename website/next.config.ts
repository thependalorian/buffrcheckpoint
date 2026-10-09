import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  // Baseline security headers (buffrcheckpoint.md §6.2). The CSP sets only
  // directives that cannot break Next.js inline scripts or third-party SDKs:
  // no framing (clickjacking), no plugins, no <base> hijack, and forms may
  // only post to this site. A full script-src policy is a later step.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=()",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
  // Apex is the CORS-allowed marketing origin. Keep www from serving a
  // separate origin that breaks browser fetch to api.buffrcheckpoint.com.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.buffrcheckpoint.com" }],
        destination: "https://buffrcheckpoint.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Ad-blocker bypass tunnel (skills.sentry.dev Next.js manual setup)
  tunnelRoute: "/monitoring",
  widenClientFileUpload: true,
  silent: !process.env.CI,
});
