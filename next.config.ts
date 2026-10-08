import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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