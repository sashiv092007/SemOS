import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Let the dev server answer GitHub Codespaces' forwarded URLs
  // (e.g. name-3000.app.github.dev); otherwise its scripts are blocked.
  allowedDevOrigins: ["*.app.github.dev"],
  // Old or mistyped Roadmap addresses go to the real page instead of a 404.
  async redirects() {
    return ["/roadmaps", "/road-map"].map((source) => ({
      source,
      destination: "/roadmap",
      permanent: false,
    }));
  },
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
