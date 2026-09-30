import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
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
