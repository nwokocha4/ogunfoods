import type { NextConfig } from "next";

const nextConfig: NextConfig = {
 experimental: {
 agentUpgrade: "security",
 },
  // Allow the Cloudflare quick-tunnel host to load dev scripts. Without
  // this, /login renders as dead HTML over the tunnel: tapping
  // "Send me a code" just reloads the page and clears the number.
  allowedDevOrigins: [
    "throws-workout-gratis-hobbies.trycloudflare.com",
    "parameter-interactions-ambassador-minimal.trycloudflare.com",
 "observation-guards-identifying-assumption.trycloudflare.com",
  ],
  // We turn off Next.js 16's Cache Components on purpose.
  // Cache Components is an advanced feature that makes some pages
  // impossible to render unless every bit of live data is wrapped in
  // Suspense. Foodrun pages are small and mostly live (cart, orders,
  // order status), so plain request-per-render rendering is simpler
  // and easier to reason about. We can revisit this later if the site
  // ever feels slow.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;