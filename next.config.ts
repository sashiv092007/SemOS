import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Let the dev server answer GitHub Codespaces' forwarded URLs
  // (e.g. name-3000.app.github.dev); otherwise its scripts are blocked.
  allowedDevOrigins: ["*.app.github.dev"],
  cacheComponents: true,
  partialPrefetching: true,
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
